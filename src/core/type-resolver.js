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
    define(type, values, config) {
        if (this.isDefined(type)) {
            throw new Error(`[Discovery] Type resolver ${type} is already defined`);
        }

        config = config || {};

        const index = new Map();
        const getId = configGetter(type, config, 'id', value => value.id);
        const getName = configGetter(type, config, 'name', getId);
        const indexKeys = configArrayGetter(type, config, 'indexKeys');
        const lookupKeys = configArrayGetter(type, config, 'lookupKeys');

        for (const value of values) {
            const descriptor = Object.freeze({
                type,
                id: getId(value),
                name: getName(value),
                value
            });

            for (const key of indexKeys) {
                index.set(key(value), descriptor);
            }
        }

        return super.define(type, value => {
            for (const key of lookupKeys) {
                const descriptor = index.get(key(value));

                if (descriptor) {
                    return descriptor;
                }
            }

            return null;
        });
    }

    resolve(value, type) {
        if (type) {
            return this.get(type)(value);
        }

        for (const resolve of this.values()) {
            const descriptor = resolve(value);

            if (descriptor) {
                return descriptor;
            }
        }

        return null;
    }
}
