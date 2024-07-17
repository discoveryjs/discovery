/* eslint-env browser */

import Dict from './dict.js';

type Action = {
    name: string;
    callback: (...args: unknown[]) => unknown;
}

export default class ActionManager extends Dict<Action> {
    #actionMap: Readonly<Record<string, Action['callback']>>;

    constructor() {
        super(true);

        this.#actionMap = Object.create(null);
    }

    define(name: string, callback: Action['callback']) {
        if (typeof callback !== 'function') {
            throw new Error('callback is not a function');
        }

        this.#actionMap = Object.freeze({
            ...this.#actionMap,
            [name]: callback
        });

        return ActionManager.define<Action>(this, name, Object.freeze({
            name,
            callback
        }));
    }

    revoke(name: string) {
        if (this.has(name)) {
            const map = { ...this.#actionMap };
            delete map[name];
            this.#actionMap = Object.freeze(map);
        }

        super.revoke(name);
    }

    get actionMap() {
        return this.#actionMap;
    }

    call(name: string, ...args: unknown[]) {
        const action = this.get(name);

        if (action === undefined) {
            throw new Error(`action "${name}" doesn't exist`);
        }

        const { callback } = action;

        return callback(...args);
    }
}
