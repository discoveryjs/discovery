/* eslint-env browser */

import Emitter from './emitter.js';

const entries = new WeakMap();

export default class Dictionary<T> extends Emitter {
    constructor() {
        super();

        entries.set(this, <{ [key: string]: T }>Object.create(null));
    }

    define(key: string, value: T): void {
        entries.get(this)[key] = value;

        this.emit('define', key, value);
    }

    isDefined(key: string): boolean {
        return key in entries.get(this);
    }

    get(key: string): T {
        return entries.get(this)[key];
    }

    get names(): string[] {
        return Object.keys(entries.get(this)).sort();
    }
}
