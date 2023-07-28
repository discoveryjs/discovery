import ObjectMarker from '../core/object-marker.js';
import jora from 'jora';

export function createDataExtensionApi(host) {
    const objectMarkers = new ObjectMarker();
    const linkResolvers = [];
    const annotations = [];
    const methods = {
        rejectData(message, renderContent) {
            throw Object.assign(new Error(message), { renderContent });
        },
        defineObjectMarker,
        lookupObjectMarker,
        lookupObjectMarkerAll,
        resolveValueLinks,
        addValueAnnotation,
        addQueryHelpers(helpers) {
            joraSetup = jora.setup(queryCustomMethods = {
                ...queryCustomMethods,
                ...helpers
            });
        },
        query(query, ...args) {
            return host.queryFn.call({ queryFnFromString: joraSetup }, query)(...args);
        }
    };
    let queryCustomMethods = {
        query: (...args) => host.query(...args),
        pageLink: (pageRef, pageId, pageParams) =>
            host.encodePageHash(pageId, pageRef, pageParams),
        marker: lookupObjectMarker,
        markerAll: lookupObjectMarkerAll,
        callAction,
        actionHandler: (actionName, ...args) => host.action.has(actionName)
            ? () => callAction(actionName, ...args)
            : undefined
    };
    let joraSetup = jora.setup(queryCustomMethods);

    return Object.assign(host => Object.assign(host, {
        objectMarkers,
        linkResolvers,
        resolveValueLinks,
        annotations,
        queryFnFromString: joraSetup
    }), { methods: methods });

    //
    // Helpers
    //

    function defineObjectMarker(name, options) {
        const { page, mark, lookup } = objectMarkers.define(name, options) || {};

        if (!lookup) {
            return () => {};
        }

        if (page !== null) {
            if (!host.page.isDefined(options.page)) {
                host.log('error', `Page reference "${options.page}" doesn't exist`);
                return;
            }

            linkResolvers.push(value => {
                const marker = lookup(value);

                if (marker !== null) {
                    return {
                        type: page,
                        text: marker.title,
                        href: marker.href,
                        entity: marker.object
                    };
                }
            });

            addValueAnnotation((value, context) => {
                const marker = lookup(value);

                if (marker && marker.object !== context.host) {
                    return {
                        place: 'before',
                        style: 'badge',
                        text: page,
                        href: marker.href
                    };
                }
            });
        } else {
            addValueAnnotation((value, context) => {
                const marker = lookup(value);

                if (marker && marker.object !== context.host) {
                    return {
                        place: 'before',
                        style: 'badge',
                        text: name
                    };
                }
            });
        }

        return mark;
    }

    function lookupObjectMarker(value, type) {
        return objectMarkers.lookup(value, type);
    }

    function lookupObjectMarkerAll(value) {
        return objectMarkers.lookupAll(value);
    }

    function addValueAnnotation(query, options = false) {
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

    function resolveValueLinks(value) {
        const result = [];
        const type = typeof value;

        if (value && (type === 'object' || type === 'string')) {
            for (const resolver of linkResolvers) {
                const link = resolver(value);

                if (link) {
                    result.push(link);
                }
            }
        }

        return result.length ? result : null;
    }

    function callAction(actionName, ...args) {
        let callback = null;

        if (typeof args[args.length - 1] === 'function') {
            callback = args.pop();
        }

        const ret = host.action.call(actionName, ...args);

        if (ret && callback && typeof ret.then === 'function') {
            return ret.then(callback);
        }

        return callback ? callback(ret) : ret;
    }
}
