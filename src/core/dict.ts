/* eslint-env browser */

import Emitter from './emitter.js';

export default class Dictionary<T> extends Emitter<{
    define(key: string, value: T): void;
}> {
    private storage: Map<string, T>;

    constructor() {
        super();

        this.storage = new Map();
    }

    define(key: string, value: T) {
        this.storage.set(key, value);
        this.emit('define', key, value);

        return value;
    }

    isDefined(key: string) {
        return this.storage.has(key);
    }

    get(key: string) {
        return this.storage.get(key);
    }
    get names() {
        return [...this.storage.keys()];
    }
    get keys() {
        return this.storage.keys();
    }
    get values() {
        return this.storage.values();
    }
    get entries() {
        return this.storage.entries();
    }
}
