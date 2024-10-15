/* eslint-env browser */

import type { Model } from '../main/model.js';
import Dict from './dict.js';

export type LogCallback = Model['log'];
export type GetterFunction<T> = ((object: T) => any) & { getterFromString?: string };
export type Getter<T> = GetterFunction<T> | keyof T;
export type LookupRefFunction<T> = ((object: LookupValue<T>) => LookupValue<T> | null | undefined) & { getterFromString?: string };
export type LookupValue<T> = T | string | number;
export type MarkerConfigGetterKeys = 'ref' | 'title';
export type MarkerConfigArrayGetter = 'refs' | 'lookupRefs';
export type ObjectMarkerConfig<T = object> = Partial<{
    annotateScalars: boolean;
    refs: Getter<T>[];
    lookupRefs: LookupRefFunction<T>[];
    page: string;
    ref: Getter<T>;
    title: Getter<T>;
}>;
export type NormalizedObjectMarkerConfig<T> = {
    name: string;
    indexRefs: GetterFunction<T>[];
    lookupRefs: LookupRefFunction<T>[];
    annotateScalars: boolean;
    page: string | null;
    getRef: GetterFunction<T> | null;
    getTitle: GetterFunction<T>;
};
export type ObjectMarkerDescriptor<T> = {
    type: string;
    object: T;
    ref: any;
    title: string;
    href: string | null;
};
export type ObjectMarker<T> = {
    name: string;
    page: string | null;
    mark(value: T): void;
    lookup(value: unknown, x?: boolean): ObjectMarkerDescriptor<T> | null;
    reset(): void;
};

const warnings = new Map<string, any[][]>();
let groupWarningsTimer: ReturnType<typeof setTimeout> | null = null;

function flushWarnings(logger: LogCallback) {
    groupWarningsTimer = null;

    for (const [caption, messages] of warnings.entries()) {
        logger({
            level: 'warn',
            message: `${caption} (${messages.length})`,
            collapsed: messages
        });
    }

    warnings.clear();
}

function groupWarning(logger: LogCallback, caption: string, ...details: any[]) {
    if (groupWarningsTimer === null && warnings.size === 0) {
        groupWarningsTimer = setTimeout(() => flushWarnings(logger), 1);
    }

    const warningsGroup = warnings.get(caption);

    if (warningsGroup !== undefined) {
        warningsGroup.push(details);
    } else {
        warnings.set(caption, [details]);
    }
}

function getter<T = object>(name: string, getter: Getter<T>, reference: string) {
    switch (typeof getter) {
        case 'function':
            return getter;

        case 'string':
            return Object.assign(
                (object: any) => object && Object.hasOwn(object, getter)
                    ? object[getter]
                    : undefined,
                { getterFromString: `object[${JSON.stringify(getter)}]` }
            );

        default:
            throw new Error(`[Discovery] Bad type "${typeof getter}" for ${reference} in object marker "${name}" config (must be a string or a function)`);
    }
}

function configGetter<F extends GetterFunction<T> | null, T>(
    name: string,
    config: ObjectMarkerConfig<T>,
    property: MarkerConfigGetterKeys,
    fallback: F
): GetterFunction<T> | F {
    const value = config && Object.hasOwn(config, property) ? config[property] : undefined;

    if (value !== undefined) {
        return getter(name, value, `"${property}" option`);
    }

    return fallback;
}

function configArrayGetter<T>(
    name: string,
    config: ObjectMarkerConfig<T>,
    property: MarkerConfigArrayGetter
) {
    const array = Array.isArray(config[property]) ? config[property] || [] : [];

    return array.map(key =>
        getter<T>(name, key, `"${property}" option`)
    );
}

function isLookupValue<T>(value: unknown, objectsOnly = false): value is LookupValue<T> {
    if (value === null) {
        return false;
    }

    return objectsOnly
        ? typeof value === 'object'
        : typeof value === 'object' || typeof value === 'number' || typeof value === 'string';
}

function createObjectMarker<T extends object>(logger: LogCallback, config: NormalizedObjectMarkerConfig<T>): ObjectMarker<T> {
    const {
        name,
        indexRefs,
        lookupRefs,
        annotateScalars,
        page,
        getRef,
        getTitle
    } = config;

    if (getRef !== null) {
        indexRefs.unshift(getRef);
    }

    if (page && getRef === null) {
        logger('warn', `Option "ref" for "${name}" marker must be specified when "page" options is defined ("page" option ignored)`);
    }

    if (indexRefs.length > 0) {
        lookupRefs.unshift(value => value);
    }

    const markedObjects = new Set<T>();
    const indexedRefs = new Map<LookupValue<T>, T>();
    const markers = new Map<LookupValue<T>, ObjectMarkerDescriptor<T>>();
    let weakRefs = new WeakMap<T, ObjectMarkerDescriptor<T>>();

    const reset = () => {
        markedObjects.clear();
        indexedRefs.clear();
        markers.clear();
        weakRefs = new WeakMap();
    };
    const mark = (object: T) => {
        if (object === null || typeof object !== 'object') {
            logger('warn', `Invalid value used for "${name}" marker (should be an object)`);
            return;
        }

        markedObjects.add(object);

        for (const indexRefGetter of indexRefs) {
            const ref = indexRefGetter(object);

            if (isLookupValue<T>(ref)) {
                // Registrate a new reference to the object
                if (!indexedRefs.has(ref)) {
                    indexedRefs.set(ref, object);
                    continue;
                }

                // Different ref getters could return the same value;
                // if the ref value already exists, it must refer to the same object; otherwise, we're dealing with
                // a collision of references, which leads to non-deterministic behavior.
                if (indexedRefs.get(ref) !== object) {
                    groupWarning(logger, `The same reference value used for different objects for "${name}" marker`, `Reference value "${ref}"`, {
                        refGetter: indexRefGetter.getterFromString || indexRefGetter,
                        ref,
                        currentObject: indexedRefs.get(ref),
                        newObject: object
                    });
                }
            }
        }
    };
    const lookup = (value: unknown, useAnnotateScalars = false): ObjectMarkerDescriptor<T> | null => {
        // value is not lookup-able
        if (!isLookupValue<T>(value, useAnnotateScalars ? !annotateScalars : false)) {
            return null;
        }

        const isObject = typeof value === 'object';
        const knownDescriptor = isObject
            ? weakRefs.get(value)
            : markers.get(value);

        // Return existing descriptor
        if (knownDescriptor !== undefined) {
            return knownDescriptor;
        }

        // Try to resolve an object by a ref
        let resolvedObject: T | null = null;

        if (isObject && markedObjects.has(value)) {
            resolvedObject = value;
        } else {
            for (const getLookupRef of lookupRefs) {
                const ref = getLookupRef(value);
                const candidate = indexedRefs.get(ref as LookupValue<T>); // enforce ref is LookupValue here, since map can take any value

                if (candidate !== undefined) {
                    resolvedObject = candidate;
                    break;
                }
            }
        }

        // No object is resolved
        if (resolvedObject === null) {
            return null;
        }

        const markersDescriptor = markers.get(resolvedObject);

        // Return existing descriptor
        if (markersDescriptor !== undefined) {
            return markersDescriptor;
        }

        // Create new descriptor
        const ref = getRef !== null ? getRef(resolvedObject) : null;

        const newDescriptor: ObjectMarkerDescriptor<T> = Object.freeze({
            type: name,
            object: resolvedObject,
            ref,
            title: getTitle(resolvedObject),
            href: page !== null && ref !== null
                ? `#${encodeURIComponent(page)}:${encodeURIComponent(ref)}`
                : null
        });

        markers.set(resolvedObject, newDescriptor);

        if (value !== resolvedObject) {
            if (isObject) {
                weakRefs.set(value, newDescriptor);
            } else {
                markers.set(value, newDescriptor);
            }
        }

        return newDescriptor;
    };

    return {
        name,
        page: getRef !== null ? page : null,
        mark,
        lookup,
        reset
    };
}

export default class ObjectMarkerManager extends Dict<ObjectMarker<object>> {
    #preventDefine = false;

    constructor(private logger: LogCallback = () => {}) {
        super();
    }

    lock() {
        this.#preventDefine = true;
    }

    define<T>(name: string, config: ObjectMarkerConfig<T>) {
        if (this.#preventDefine) {
            throw new Error('Object marker definition is not allowed after setup');
        }

        if (this.isDefined(name)) {
            throw new Error(`Object marker "${name}" is already defined, new definition ignored`);
        }

        config = config || {};

        const indexRefs = configArrayGetter(name, config, 'refs');
        const lookupRefs = configArrayGetter(name, config, 'lookupRefs');
        const annotateScalars = Boolean(config.annotateScalars);
        const configPage = config.page; // Otherwise TS doesn't infer page type right
        const page = typeof configPage === 'string' ? configPage : null;
        const getRef = configGetter(name, config, 'ref', null);
        const getTitle = configGetter(name, config, 'title', getRef || (() => null));

        return ObjectMarkerManager.define(this, name, Object.freeze(createObjectMarker(this.logger, {
            name,
            indexRefs,
            lookupRefs,
            annotateScalars,
            page,
            getRef,
            getTitle
        })));
    }

    reset() {
        for (const { reset } of this.values) {
            reset();
        }
    }

    markerMap() {
        return Object.fromEntries(
            [...this.entries].map(([name, marker]) => [name, marker.mark])
        );
    }

    // Returns first lookup match if marker is not specified
    lookup(value: unknown, marker?: string) {
        if (typeof marker === 'string') {
            return this.get(marker)?.lookup(value) || null;
        }

        for (const { lookup } of this.values) {
            const marker = lookup(value);

            if (marker !== null) {
                return marker;
            }
        }

        return null;
    }

    // Returns all lookup matches
    lookupAll(value: unknown) {
        const markers: ObjectMarkerDescriptor<object>[] = [];

        for (const { lookup } of this.values) {
            const marker = lookup(value);

            if (marker !== null) {
                markers.push(marker);
            }
        }

        return markers;
    }
}
