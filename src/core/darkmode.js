/* eslint-env browser */
import { localStorageEntry } from './utils/persistent.js';

const validValues = new Set([true, false, 'auto', 'disabled']);
const instances = new Set();
const prefersDarkModeMedia = matchMedia('(prefers-color-scheme:dark)');
const localStorage = localStorageEntry('discoveryjs:darkmode');
const localStorageToValue = new Map([
    ['true', true],
    ['false', false],
    ['auto', 'auto']
]);
let localStorageValue = null;

function applyPrefersColorScheme() {
    for (const instance of instances) {
        if (instance.mode === 'auto') {
            instance.set('auto');
        }
    }
}

function applyLocalStorageValue(value) {
    // eslint-disable-next-statement operator-linebreak
    const newValue = localStorageToValue.has(value)
        ? localStorageToValue.get(value)
        : null;

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
prefersDarkModeMedia.addListener(applyPrefersColorScheme); // Safari doesn't support for addEventListener()

function resolveInitValue(value, persistent) {
    if (value === 'off' || value === 'disable') {
        value = 'disabled';
    }

    // use value from a localStorage when persistent
    if (value !== 'disabled' && persistent && localStorageValue !== null) {
        value = localStorageValue;
    }

    return value;
}

function resolveSetValue(value) {
    if (!validValues.has(value)) {
        value = 'disabled';
    }

    return value === 'auto' ? prefersDarkModeMedia.matches : value === true;
}

export function resolveDarkmodeValue(value, persistent) {
    return resolveSetValue(resolveInitValue(value, persistent));
}

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
        this.set(resolveInitValue(value, persistent), true);

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
        this.value = resolveSetValue(value);

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
