/* eslint-env browser */
import { localStorageEntry } from '../core/utils/persistent.js';

const validValues = new Set([true, false, 'auto', 'disabled']);
const instances = new Set();
const prefersDarkModeMedia = matchMedia('(prefers-color-scheme:dark)');
const localStorage = localStorageEntry('discoveryjs:darkmode');
let localStorageValue = null;

function applyPrefersColorScheme() {
    for (const instance of instances) {
        if (instance.mode === 'auto') {
            instance.set('auto');
        }
    }
}

function applyLocalStorageValue(value) {
    const newValue =
        value === 'true' ? true :
        value === 'false' ? false :
        value === 'auto' ? 'auto' :
        null;

    if (localStorageValue !== newValue) {
        localStorageValue = newValue;
        for (const instance of instances) {
            if (instance.persistent && instance.mode !== 'disabled') {
                instance.set(newValue !== null ? newValue : 'auto');
            }
        }
    }
}

// attach
applyLocalStorageValue(localStorage.value);
localStorage.on(applyLocalStorageValue);
prefersDarkModeMedia.addListener(applyPrefersColorScheme);

// input value | controller internal state
//             | -------------------------
//             | mode     | value
// =========== | ======== | ==============
// 'disabled'  | disabled | false
// 'auto'      | auto     | [depends on prefers-color-scheme]
// false       | manual   | false
// true        | manual   | true

export class DarkModeController {
    constructor(value, persistent) {
        this.persistent = persistent ? localStorage : null;
        this.handlers = [];
        this.set(
            // use value from a localStorage when persistent
            value !== 'disabled' && this.persistent !== null && localStorageValue !== null
                ? localStorageValue
                : value,
            true
        );

        instances.add(this);
    }

    on(fn, fire) {
        let entry = { fn };
        this.handlers.push(entry);

        if (fire) {
            entry.fn(this.value, this.mode);
        }

        return () => {
            const index = this.handlers.indexOf(entry);
            entry = null;

            if (index !== -1) {
                this.handlers.splice(index, 1);
            }
        };
    }

    destroy() {
        instances.delete(this);
    }

    set(value, init) {
        const oldValue = this.value;
        const oldMode = this.mode;

        if (!validValues.has(value)) {
            console.warn('Bad value "' + value + '" for darkmode, fallback to "disabled"');
            value = 'disabled';
        }

        this.mode = typeof value === 'boolean' ? 'manual' : value;
        this.value = this.mode === 'auto' ? prefersDarkModeMedia.matches : value === true;

        if (this.mode !== 'disabled') {
            if (this.persistent && !init) {
                this.persistent.set(this.mode === 'auto' ? 'auto' : this.value);
            }

            if (this.value !== oldValue || this.mode !== oldMode) {
                this.handlers.forEach(({ fn }) => fn(this.value, this.mode));
            }
        }
    }

    toggle(useAutoForManual) {
        switch (this.mode) {
            case 'auto':
                this.set(!prefersDarkModeMedia.matches);
                break;

            case 'manual':
                this.set(useAutoForManual && this.value !== prefersDarkModeMedia.matches ? 'auto' : !this.value);
                break;
        }
    }
}
