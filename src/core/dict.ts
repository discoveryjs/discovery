/* eslint-env browser */

import Emitter from './emitter.js';

const entries = new WeakMap();

export default class Dictionary<T> extends Emitter {
    constructor() {
        super();

        entries.set(this, <{ [key: string]: T }>Object.create(null));
    }

    protected set(key: string, value: T): void {
        entries.get(this)[key] = value;

        this.emit('define', key, value);
    }

    get(key: string): T {
        return entries.get(this)[key];
    }

    has(key: string): boolean {
        return key in entries.get(this);
    }

    get names(): string[] {
        return Object.keys(entries.get(this)).sort();
    }
}
