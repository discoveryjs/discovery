/* eslint-env browser */

import Dict from './dict.js';

type Getter = string | ((object: Object) => any);
export type MarkerConfig = {
    refs?: Getter[];
    lookupRefs?: Getter[];
    page?: string;
    ref?: Getter;
    title?: Getter;
};
type CreateObjectMarkerConfig = {
    name: string;
    indexRefs?: Function[];
    lookupRefs?: Function[];
    page?: string;
    getRef?: Function | null;
    getTitle?: Function;
};
export type ObjectMarkerDescriptor = {
    type: string;
    object: Object;
    ref: any;
    title: string;
    href: string | null;
};
export type ObjectMarker = {
    page: string | null;
    mark(value: Object): void;
    lookup(value: Object | string | number): ObjectMarkerDescriptor | null
};

const { hasOwnProperty } = Object.prototype;
let warnings = new Map<string, any[][]>();
let groupWarningsTimer = null;

function flushWarnings() {
    groupWarningsTimer = null;

    for (const [caption, messages] of warnings.entries()) {
        console.groupCollapsed(`${caption} (${messages.length})`);
        messages.forEach(item => console.warn(...item));
        console.groupEnd();
    }

    warnings.clear();
}

function groupWarning(caption: string, ...details: any[]) {
    if (groupWarningsTimer === null && warnings.size === 0) {
        groupWarningsTimer = setTimeout(flushWarnings, 1);
    }

    if (warnings.has(caption)) {
        warnings.get(caption).push(details);
    } else {
        warnings.set(caption, [details]);
    }
}

function getter(name: string, getter: Getter, reference: string) {
    switch (typeof getter) {
        case 'function':
            return getter;

        case 'string':
            return Object.assign(
                (value: Object) => value && hasOwnProperty.call(value, getter)
                    ? value[getter]
                    : undefined,
                { getterFromString: `object[${JSON.stringify(getter)}]` }
            );

        default:
            throw new Error(`[Discovery] Bad type "${typeof getter}" for ${reference} in object marker "${name}" config (must be a string or a function)`);
    }
}

function configGetter(
    name: string,
    config: MarkerConfig,
    property: 'ref' | 'title', // TODO: infer using `keyof MarkerConfig`
    fallback: Function | null
) {
    if (config && hasOwnProperty.call(config, property)) {
        return getter(name, config[property], `"${property}" option`);
    }

    return fallback;
}

function configArrayGetter(
    name: string,
    config: MarkerConfig,
    property: 'refs' | 'lookupRefs' // TODO: infer using `keyof MarkerConfig`
) {
    return (Array.isArray(config[property]) ? config[property] : [])
        .map(value => getter(name, value, `"${property}" option`));
}

function createObjectMarker(config: CreateObjectMarkerConfig): ObjectMarker {
    const {
        name,
        indexRefs,
        lookupRefs,
        page,
        getRef,
        getTitle
    } = config;

    if (page) {
        if (getRef !== null) {
            indexRefs.unshift(getRef);
        } else {
            console.warn(`Option "ref" for "${name}" marker must be specified when "page" options is defined ("page" option ignored)`);
        }
    }

    if (indexRefs.length > 0) {
        lookupRefs.unshift(value => value);
    }

    const markedObjects = new Set();
    const indexedRefs = new Map();
    const markers = new Map();
    const weakRefs = new WeakMap();

    const mark = (value: Object) => {
        if (value === null || typeof value !== 'object') {
            console.warn(`Invalid value used for "${name}" marker (should be an object)`);
            return;
        }

        markedObjects.add(value);

        for (const indexRefGetter of indexRefs) {
            const ref = indexRefGetter(value);
            const type = ref === null ? 'null' : typeof ref;

            if (type === 'object' || type === 'string' || type === 'number') {
                if (!indexedRefs.has(ref)) {
                    indexedRefs.set(ref, value);
                    continue;
                }

                // it's ok when the same value refers to the same object
                if (indexedRefs.get(ref) !== value) {
                    groupWarning(`The same reference value used for different objects for "${name}" marker`, `Reference value "${ref}"`, {
                        refGetter: indexRefGetter.getterFromString || indexRefGetter,
                        ref,
                        currentObject: indexedRefs.get(ref),
                        newObject: value
                    });
                }
            }
        }
    };
    const lookup = (value: Object | string | number) => {
        const valueType = value === null ? 'null' : typeof value;
        const isObject = value !== null && typeof value === 'object';

        if (!isObject && valueType !== 'string' && valueType !== 'number') {
            return null;
        }

        if (markers.has(value)) {
            return markers.get(value);
        }

        if (isObject && weakRefs.has(value)) {
            return weakRefs.get(value);
        }

        let marker: ObjectMarkerDescriptor = null;
        let resolvedValue = null;

        if (markedObjects.has(value)) {
            resolvedValue = value;
        } else {
            for (const getLookupRef of lookupRefs) {
                const ref = getLookupRef(value);

                if (indexedRefs.has(ref)) {
                    resolvedValue = indexedRefs.get(ref);
                    break;
                }
            }
        }

        if (resolvedValue !== null) {
            if (markers.has(resolvedValue)) {
                marker = markers.get(resolvedValue);
            } else {
                const ref = getRef !== null ? getRef(resolvedValue) : null;

                marker = Object.freeze({
                    type: name,
                    object: resolvedValue,
                    ref,
                    title: getTitle(resolvedValue),
                    href: page !== null && ref !== null
                        ? `#${encodeURIComponent(page)}:${encodeURIComponent(ref)}`
                        : null
                });

                markers.set(resolvedValue, marker);
            }

            if (value !== resolvedValue) {
                if (isObject) {
                    weakRefs.set(value, marker);
                } else {
                    markers.set(value, marker);
                }
            }
        }

        return marker;
    };

    return {
        page: getRef !== null ? page : null,
        mark,
        lookup
    };
}

export default class ObjectMarkerDict extends Dict<ObjectMarker> {
    define(name: string, config: MarkerConfig) {
        if (this.isDefined(name)) {
            console.error(`[Discovery] Object marker "${name}" is already defined, new definition ignored`);
            return;
        }

        config = config || {};

        const indexRefs = configArrayGetter(name, config, 'refs');
        const lookupRefs = configArrayGetter(name, config, 'lookupRefs');
        const page = typeof config.page === 'string' ? config.page : null;
        const getRef = configGetter(name, config, 'ref', null);
        const getTitle : Function= configGetter(name, config, 'title', getRef || (() => null));

        return super.define(name, createObjectMarker({
            name,
            indexRefs,
            lookupRefs,
            page,
            getRef,
            getTitle
        }));
    }

    lookup(value: Object | string | number, marker?: string) {
        if (marker) {
            return this.get(marker).lookup(value);
        }

        for (const { lookup } of this.values) {
            const marker = lookup(value);

            if (marker !== null) {
                return marker;
            }
        }

        return null;
    }

    lookupAll(value: Object | string | number) {
        const markers: ObjectMarkerDescriptor[] = [];

        for (const { lookup } of this.values) {
            const marker = lookup(value);

            if (marker !== null) {
                markers.push(marker);
            }
        }

        return markers.length ? markers : null;
    }
}
