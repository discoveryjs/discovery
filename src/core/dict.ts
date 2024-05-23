/* eslint-env browser */

import Emitter from './emitter.js';

export default class Dictionary<V, K = string> extends Emitter<{
    define(key: K, value: V): void;
    revoke(key: K): void;
}> {
    #entries: Map<K, V>;
    #allowRevoke: boolean;

    protected static define<V, K = string>(dict: Dictionary<V, K>, key: K, value: Readonly<V>) {
        dict.#entries.set(key, value);
        dict.emit('define', key, value);

        return value;
    }

    constructor(allowRevoke?: boolean) {
        super();

        this.#entries = new Map();
        this.#allowRevoke = Boolean(allowRevoke);
    }

    revoke(key: K) {
        if (!this.#allowRevoke) {
            throw new Error('Entry revoking is not allowed');
        }

        this.#entries.delete(key);
        this.emit('revoke', key);
    }

    isDefined(key: K) {
        return this.#entries.has(key);
    }
    has(key: K) {
        return this.#entries.has(key);
    }

    get(key: K) {
        return this.#entries.get(key);
    }
    get names() {
        return [...this.#entries.keys()];
    }

    get keys() {
        return this.#entries.keys();
    }
    get values() {
        return this.#entries.values();
    }
    get entries() {
        return this.#entries.entries();
    }
}
