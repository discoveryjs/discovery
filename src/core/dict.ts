/* eslint-env browser */

import Emitter from './emitter.js';

export default class Dictionary<T> extends Emitter {
    private entries: Map<string, T>;

    constructor() {
        super();
        this.entries = new Map();
    }

    protected set(key: string, value: T): void {
        this.entries[key] = value;
        this.emit('define', key, value);
    }

    get(key: string): T {
        return this.entries[key];
    }

    has(key: string): boolean {
        return key in this.entries;
    }

    get names(): string[] {
        return Object.keys(this.entries).sort();
    }
}
