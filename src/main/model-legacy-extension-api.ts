import jora from 'jora';
import ObjectMarker, { ObjectMarkerConfig } from '../core/object-marker.js';
import { LegacyPrepareContextApi, PrepareContextApiWrapper, Model, Query, SetupQueryMethodsExtension } from './model.js';
import { ValueAnnotationContext, Widget } from './widget.js';

export function createLegacyExtensionApi(host: Model): PrepareContextApiWrapper {
    const objectMarkers = new ObjectMarker();
    const linkResolvers: Model['linkResolvers'] = [];
    const annotations: Widget['annotations'] = [];
    const contextApi: LegacyPrepareContextApi = {
        rejectData(message: string, renderContent: any) {
            throw Object.assign(new Error(message), { renderContent });
        },
        defineObjectMarker,
        lookupObjectMarker,
        lookupObjectMarkerAll,
        addValueAnnotation,
        addQueryHelpers(helpers: SetupQueryMethodsExtension) {
            joraSetup = jora.setup({
                methods: queryCustomMethods = {
                    ...queryCustomMethods,
                    ...helpers
                }
            });
        },
        query(query: Query, ...args: unknown[]) {
            return host.queryFn.call({ queryFnFromString: joraSetup }, query)(...args);
        }
    };
    let queryCustomMethods = {
        query: host.query.bind(host),
        overrideProps,
        pageLink: (pageRef, pageId, pageParams) =>
            host.encodePageHash(pageId, pageRef, pageParams),
        marker: lookupObjectMarker,
        markerAll: lookupObjectMarkerAll,
        callAction,
        actionHandler: (actionName: string, ...args: unknown[]) => host.action.has(actionName)
            ? () => callAction(actionName, ...args)
            : undefined
    };
    let joraSetup = jora.setup({ methods: queryCustomMethods });

    return {
        contextApi,
        after(host: Model) {
            Object.assign(host, {
                objectMarkers,
                linkResolvers,
                annotations,
                queryFnFromString: joraSetup
            });
        }
    };

    //
    // Helpers
    //

    function defineObjectMarker(name: string, options: ObjectMarkerConfig & { annotateScalars?: boolean }) {
        const annotateScalars = Boolean(options?.annotateScalars);
        const { page, mark, lookup } = objectMarkers.define(name, options) || {};

        if (!lookup) {
            return () => {};
        }

        if (page !== null) {
            if (!(host as any).page?.isDefined(page)) { // FIXME: temporary solution
                host.log('error', `Page reference "${page}" doesn't exist`);
                return () => {};
            }

            linkResolvers.push((value: any) => {
                const marker = lookup(value);

                return marker && {
                    type: page,
                    text: marker.title,
                    href: marker.href,
                    entity: marker.object
                };
            });
        }

        addValueAnnotation((value: any, context: ValueAnnotationContext) => {
            const marker = annotateScalars || (typeof value === 'object' && value !== null)
                ? lookup(value)
                : null;

            if (marker !== null && marker.object !== context.host) {
                return {
                    place: 'before',
                    style: 'badge',
                    text: name,
                    href: marker.href
                };
            }
        });

        return mark;
    }

    function lookupObjectMarker(value: any, type?: string) {
        return objectMarkers.lookup(value, type);
    }

    function lookupObjectMarkerAll(value) {
        return objectMarkers.lookupAll(value);
    }

    function overrideProps(current: any, props = this.context.props) {
        if (!props) {
            return current;
        }

        const result = { ...current };

        for (const key of Object.keys(result)) {
            if (Object.hasOwn(props, key)) {
                result[key] = props[key];
            }
        }

        return result;
    }

    function addValueAnnotation(query: Query, options: object | boolean = false) {
        if (typeof options === 'boolean') {
            options = {
                debug: options
            };
        }

        annotations.push({
            query,
            ...options
        });
    }

    function callAction(actionName: string, ...args: unknown[]) {
        const lastArg = args[args.length - 1];
        let callback: Function | null = null;

        if (typeof lastArg === 'function') {
            callback = lastArg;
            args.pop();
        }

        const ret: any = host.action.call(actionName, ...args);

        if (ret && callback && typeof ret.then === 'function') {
            return ret.then(callback);
        }

        return callback ? callback(ret) : ret;
    }
}
