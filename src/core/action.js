/* eslint-env browser */

import Dict from './dict.js';

const actionMap = new WeakMap();

export default class ActionManager extends Dict {
    constructor(host) {
        super(true);

        this.host = host;
        actionMap.set(this, Object.create(null));
    }

    define(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('callback is not a function');
        }

        actionMap.set(this, Object.freeze({
            ...actionMap.get(this),
            [name]: callback
        }));
        super.define(name, Object.freeze({
            name,
            callback
        }));
    }

    revoke(name) {
        if (this.has(name)) {
            const map = { ...actionMap.get(this) };
            delete map[name];
            actionMap.set(this, Object.freeze(map));
        }

        super.revoke(name);
    }

    get actionMap() {
        return actionMap.get(this);
    }

    call(name, ...args) {
        if (!this.has(name)) {
            throw new Error(`action "${name}" doesn't exist`);
        }

        const { callback } = this.get(name);

        return callback(...args);
    }
}
