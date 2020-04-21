/* eslint-env browser */

import Emitter from './emitter.js';

const entries = new WeakMap();

export default class Dictionary extends Emitter {
    constructor() {
        super();

        entries.set(this, Object.create(null));
    }

    define(key, value) {
        entries.get(this)[key] = value;

        this.emit('define', key, value);

        return value;
    }

    isDefined(key) {
        return key in entries.get(this);
    }

    get(key) {
        return entries.get(this)[key];
    }

    get names() {
        return Object.keys(entries.get(this));
    }
    get values() {
        return Object.values(entries.get(this));
    }
    get entries() {
        return Object.entries(entries.get(this));
    }
}
