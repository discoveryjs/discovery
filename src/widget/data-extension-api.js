import ObjectMarker from '../core/object-marker.js';
import jora from 'jora';

export function createDataExtensionApi(instance) {
    const objectMarkers = new ObjectMarker();
    const linkResolvers = [];
    const annotations = [];
    const lookupObjectMarker = (value, type) => objectMarkers.lookup(value, type);
    const lookupObjectMarkerAll = (value) => objectMarkers.lookupAll(value);
    const addValueAnnotation = (query, options = false) => {
        if (typeof options === 'boolean') {
            options = {
                debug: options
            };
        }

        annotations.push({
            query,
            ...options
        });
    };
    const resolveValueLinks = (value) => {
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
    };

    let queryCustomMethods = {
        query: (...args) => instance.query(...args),
        pageLink: (pageRef, pageId, pageParams) =>
            instance.encodePageHash(pageId, pageRef, pageParams),
        marker: lookupObjectMarker,
        markerAll: lookupObjectMarkerAll
    };
    let queryCustomMethodsInfo = {};
    let joraSetup = jora.setup(queryCustomMethods, queryCustomMethodsInfo);

    return {
        apply() {
            Object.assign(instance, {
                objectMarkers,
                linkResolvers,
                resolveValueLinks,
                annotations,
                queryFnFromString: joraSetup
            });
        },
        methods: {
            rejectData(message, renderContent) {
                throw Object.assign(new Error(message), { renderContent });
            },
            lookupObjectMarker,
            lookupObjectMarkerAll,
            resolveValueLinks,
            defineObjectMarker(name, options) {
                const { page, mark, lookup } = objectMarkers.define(name, options) || {};

                if (!lookup) {
                    return () => {};
                }

                if (page !== null) {
                    if (!instance.page.isDefined(options.page)) {
                        console.error(`[Discovery] Page reference "${options.page}" doesn't exist`);
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
            },
            addValueAnnotation,
            addQueryHelpers(helpers) {
                const helpersMethods = {};
                const helpersMethodsInfo = {};

                for (const [name, descriptor] of Object.entries(helpers)) {
                    if (typeof descriptor === 'function') {
                        helpersMethods[name] = descriptor;
                    } else {
                        helpersMethods[name] = descriptor.method;
                        helpersMethodsInfo[name] = descriptor;
                    }
                }

                joraSetup = jora.setup(queryCustomMethods = {
                    ...queryCustomMethods,
                    ...helpersMethods
                }, queryCustomMethodsInfo = {
                    ...queryCustomMethodsInfo,
                    ...helpersMethodsInfo
                });
            },
            query(query, ...args) {
                return instance.queryFn.call({ queryFnFromString: joraSetup }, query)(...args);
            }
        }
    };
}
