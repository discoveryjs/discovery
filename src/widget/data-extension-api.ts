import ObjectMarkerDict, { MarkerConfig, ObjectMarker } from '../core/object-marker.js';
import { AnnotationConfig } from '../views/struct/render-annotations.js';
import jora from 'jora';

type Annotation = {
    query: string | ((value: any, context: any) => AnnotationConfig);
    debug?: boolean;
};
type PrepareApi = {
    rejectData(message: string, renderContent): void;
    lookupObjectMarker;
    lookupObjectMarkerAll;
    resolveValueLinks;
    defineObjectMarker(name: string, options: MarkerConfig): ObjectMarker['mark'],
    addValueAnnotation,
    addQueryHelpers(helpers: Object): void;
    query(query, ...args): void;
};
type DataExtensionApi = {
    apply(): void;
    methods: PrepareApi;
};

export function createDataExtensionApi(instance) {
    const objectMarkers = new ObjectMarkerDict();
    const linkResolvers = [];
    const annotations: Annotation[] = [];
    const lookupObjectMarker = (value, type) => objectMarkers.lookup(value, type);
    const lookupObjectMarkerAll = (value) => objectMarkers.lookupAll(value);
    const addValueAnnotation = (query: Annotation['query'], options: Omit<Annotation, 'query'> | boolean = false) => {
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
    const resolveValueLinks = (value: any) => {
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
    let joraSetup = jora.setup(queryCustomMethods);

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
            rejectData(message: string, renderContent) {
                throw Object.assign(new Error(message), { renderContent });
            },
            lookupObjectMarker,
            lookupObjectMarkerAll,
            resolveValueLinks,
            defineObjectMarker(name: string, options: MarkerConfig) {
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

                    addValueAnnotation((value: any, context: any) => {
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
                    addValueAnnotation((value: any, context: any) => {
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
                joraSetup = jora.setup(queryCustomMethods = {
                    ...queryCustomMethods,
                    ...helpers
                });
            },
            query(query, ...args) {
                return instance.queryFn.call({ queryFnFromString: joraSetup }, query)(...args);
            }
        }
    };
}
