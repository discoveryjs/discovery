import type { Model, ModelOptions, PageAnchor, PageParams, PageRef, PrepareContextApiWrapper, SetDataOptions, SetupMethods, SetupQueryMethodsExtension } from './model.js';
import type { ObjectMarkerConfig } from '../core/object-marker.js';
import modelCommonJoraMethods from './model-common-jora-methods.js';
import modelCommonJoraAssertions from './model-common-jora-assertions.js';
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
        addQueryHelpers(methods) { // deprecated
            host.logger.warn('addQueryHelpers() is deprecated, use addQueryMethods() instead');
            return addQueryMethods(methods);
        },
        addQueryMethods,
        addQueryAssertions
    };
    let queryCustomMethods = {
        ...modelCommonJoraMethods,
        query: host.query.bind(host),
        pageLink: (pageRef: PageRef, pageId: string, pageParams: PageParams, pageAnchor: PageAnchor) =>
            host.encodePageHash(pageId, pageRef, pageParams, pageAnchor),
        marker: objectMarkers.lookup.bind(objectMarkers),
        markerAll: objectMarkers.lookupAll.bind(objectMarkers),
        callAction,
        actionHandler: (actionName: string, ...args: unknown[]) => host.action.has(actionName)
            ? () => callAction(actionName, ...args)
            : undefined
    };
    let queryCustomAssertions = {
        ...modelCommonJoraAssertions
    };

    if (typeof setup === 'function') {
        setup(methods);
    }

    objectMarkers.lock();

    host.queryFnFromString = jora.setup({
        methods: queryCustomMethods,
        assertions: queryCustomAssertions
    });

    //
    // Helpers
    //

    function addQueryMethods(methods: SetupQueryMethodsExtension) {
        queryCustomMethods = {
            ...queryCustomMethods,
            ...methods
        };
    }

    function addQueryAssertions(assertions: SetupQueryMethodsExtension) {
        queryCustomAssertions = {
            ...queryCustomAssertions,
            ...assertions
        };
    }

    function defineObjectMarker<T>(name: string, options: ObjectMarkerConfig<T>) {
        const { mark, lookup } = objectMarkers.define(name, options);

        if (!lookup) {
            return () => {};
        }

        return mark;
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
