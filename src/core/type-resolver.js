/* eslint-env browser */

import Dict from './dict.js';

function getter(type, getter, reference) {
    switch (typeof getter) {
        case 'function':
            return getter;
        case 'string':
            return value => value ? value[getter] : undefined;
        default:
            throw new Error(`[Discovery] Bad type "${typeof key}" for ${reference} in resolver "${type}" config (must be a string or a function)`);
    }
}

function configGetter(type, config, property, fallback) {
    if (hasOwnProperty.call(config, property)) {
        return getter(type, config[property], `"${property}" option`);
    }

    return fallback;
}

function configArrayGetter(type, config, property) {
    return [value => value]
        .concat(Array.isArray(config[property]) ? config[property] : [])
        .map(key => getter(type, key, `"${property}" option`));
}

export default class TypeResolver extends Dict {
    define(type, config) {
        if (this.isDefined(type)) {
            throw new Error(`[Discovery] Type resolver ${type} is already defined`);
        }

        config = config || {};

        const getId = configGetter(type, config, 'id', value => value.id);
        const getName = configGetter(type, config, 'name', getId);
        const indexKeys = configArrayGetter(type, config, 'indexKeys');
        const lookupKeys = configArrayGetter(type, config, 'lookupKeys');
        const index = new Map();
        const descriptors = new Map();
        const mark = value => {
            for (const key of indexKeys) {
                index.set(key(value), value);
            }
        };
        const resolver = value => {
            if (descriptors.has(value)) {
                return descriptors.get(value);
            }

            let descriptor = null;

            for (const key of lookupKeys) {
                const indexKey = key(value);

                if (index.has(indexKey)) {
                    const resolvedValue = index.get(indexKey);

                    descriptor = Object.freeze({
                        type,
                        id: getId(resolvedValue),
                        name: getName(resolvedValue),
                        value: resolvedValue
                    });

                    break;
                }
            }

            descriptors.set(value, descriptor);

            return descriptor;
        };

        resolver.markOne = value => mark(value) || resolver;
        resolver.mark = values => {
            for (const value of values) {
                mark(value);
            }

            return resolver;
        };

        return super.define(type, resolver);
    }

    resolve(value, type) {
        if (type) {
            return this.get(type)(value);
        }

        for (const resolve of this.values) {
            const descriptor = resolve(value);

            if (descriptor) {
                return descriptor;
            }
        }

        return null;
    }
}
