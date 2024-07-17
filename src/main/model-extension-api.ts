import jora from 'jora';
import type { Model, ModelOptions, PrepareContextApiWrapper, SetupMethods, SetupQueryMethodsExtension } from './model.js';
import { ObjectMarkerConfig } from '../core/object-marker.js';

export function createExtensionApi(host: Model): PrepareContextApiWrapper {
    return {
        before() {
            host.objectMarkers.reset();
        },
        contextApi: {
            markers: host.objectMarkers.markerMap(),
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
        addQueryHelpers(helpers: SetupQueryMethodsExtension) {
            queryCustomMethods = {
                ...queryCustomMethods,
                ...helpers
            };
        }
    };
    let queryCustomMethods = {
        query: host.query.bind(host),
        overrideProps,
        pageLink: host.encodePageHash.bind(host),
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

    function defineObjectMarker(name: string, options: ObjectMarkerConfig) {
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
            if (Object.hasOwn(props, key)) {
                result[key] = props[key];
            }
        }

        return result;
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
