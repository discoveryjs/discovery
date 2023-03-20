/* eslint-env browser */

import Emitter from './emitter.js';

const entries = new WeakMap();

export default class Dictionary extends Emitter {
    constructor(allowRevoke) {
        super();

        entries.set(this, new Map());

        if (allowRevoke) {
            this.revoke = (key) => {
                entries.get(this).delete(key);
                this.emit('revoke', key);
            };
        }
    }

    define(key, value) {
        entries.get(this).set(key, value);
        this.emit('define', key, value);

        return value;
    }

    isDefined(key) {
        return entries.get(this).has(key);
    }
    has(key) {
        return entries.get(this).has(key);
    }

    get(key) {
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
