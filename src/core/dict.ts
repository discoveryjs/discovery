/* eslint-env browser */

import Emitter from './emitter.js';

const entries = new WeakMap();

export default class Dictionary<T> extends Emitter<{
    define(key: string, value: T): void;
}> {
    constructor() {
        super();

        entries.set(this, new Map());
    }

    define(key: string, value: T) {
        entries.get(this).set(key, value);
        this.emit('define', key, value);

        return value;
    }

    isDefined(key: string) {
        return entries.get(this).has(key);
    }

    get(key: string) {
        return entries.get(this).get(key);
    }
    get names() {
        return [...entries.get(this).keys()];
    }

    get keys() {
        return entries.get(this).keys();
    }
    get values() {
        return entries.get(this).values();
    }
    get entries() {
        return entries.get(this).entries();
    }
}
