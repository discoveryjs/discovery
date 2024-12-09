import type { Model, ModelOptions, PageAnchor, PageParams, PageRef, PrepareContextApiWrapper, SetDataOptions, SetupMethods } from './model.js';
import type { ObjectMarkerConfig } from '../core/object-marker.js';
import { hasOwn } from '../core/utils/object-utils.js';
import jora from 'jora';

export function createExtensionApi(host: Model, options?: SetDataOptions): PrepareContextApiWrapper {
    return {
        before() {
            host.objectMarkers.reset();
        },
        contextApi: {
            markers: host.objectMarkers.markerMap(),
            setWorkTitle: options?.setPrepareWorkTitle || (() => Promise.resolve()),
            rejectData(message: string, renderContent: any) {
                throw Object.assign(new Error(message), { renderContent });
            }
        }
    };
}

export function setupModel(host: Model, setup: ModelOptions['setup']) {
    const objectMarkers = host.objectMarkers;
    const methods: SetupMethods = {
        setPrepare: host.setPrepare.bind(host),
        defineObjectMarker,
        addQueryHelpers(helpers) {
            queryCustomMethods = {
                ...queryCustomMethods,
                ...helpers
            };
        }
    };
    let queryCustomMethods = {
        query: host.query.bind(host),
        overrideProps,
        pageLink: (pageRef: PageRef, pageId: string, pageParams: PageParams, pageAnchor: PageAnchor) =>
            host.encodePageHash(pageId, pageRef, pageParams, pageAnchor),
        marker: objectMarkers.lookup.bind(objectMarkers),
        markerAll: objectMarkers.lookupAll.bind(objectMarkers),
        callAction,
        actionHandler: (actionName: string, ...args: unknown[]) => host.action.has(actionName)
            ? () => callAction(actionName, ...args)
            : undefined
    };

    if (typeof setup === 'function') {
        setup(methods);
    }

    objectMarkers.lock();

    host.queryFnFromString = jora.setup({ methods: queryCustomMethods });

    //
    // Helpers
    //

    function defineObjectMarker<T>(name: string, options: ObjectMarkerConfig<T>) {
        const { mark, lookup } = objectMarkers.define(name, options);

        if (!lookup) {
            return () => {};
        }

        return mark;
    }

    function overrideProps(current: any, props = this.context.props) {
        if (!props) {
            return current;
        }

        const result = { ...current };

        for (const key of Object.keys(result)) {
            if (hasOwn(props, key)) {
                result[key] = props[key];
            }
        }

        return result;
    }

    function callAction(actionName: string, ...args: unknown[]) {
        const lastArg = args[args.length - 1];
        // eslint-disable-next-line @typescript-eslint/ban-types
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
