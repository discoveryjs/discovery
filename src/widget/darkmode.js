/* eslint-env browser */

const storageKey = 'discoveryjs:darkmode';
const validValues = new Set([true, false, 'auto', 'disabled']);
const instances = new Set();
const prefersDarkModeMedia = matchMedia('(prefers-color-scheme:dark)');
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

function onLocalStorageChange(e) {  
    if (e.key === storageKey) {
        applyLocalStorageValue(e.newValue);
    }
}

function attach() {
    applyLocalStorageValue(localStorage[storageKey]);
    addEventListener('storage', onLocalStorageChange);
    prefersDarkModeMedia.addEventListener('change', applyPrefersColorScheme);
}

function detach() {
    removeEventListener('storage', onLocalStorageChange);
    prefersDarkModeMedia.removeEventListener('change', applyPrefersColorScheme);
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
        this.persistent = Boolean(persistent);
        this.handlers = [];
        this.set(
            // sync with localStorage on init if necessary
            value === 'auto' && this.persistent && localStorageValue !== null
                ? localStorageValue
                : value
        );

        instances.add(this);
    }

    on(fn) {
        this.handlers.push(fn);

        return this;
    }

    off(fn) {
        const index = this.handlers.indexOf(fn);

        if (index !== -1) {
            this.handlers.splice(index, 1);
        }

        return this;
    }

    destroy() {
        instances.delete(this);
    }

    set(value) {
        const oldValue = this.value;
        const oldMode = this.mode;

        if (!validValues.has(value)) {
            console.warn('Bad value "' + value + '" for darkmode, fallback to "disabled"');
            value = 'disabled';
        }

        this.mode = typeof value === 'boolean' ? 'manual' : value;
        this.value = this.mode === 'auto' ? prefersDarkModeMedia.matches : value === true;
        console.log({ mode: oldMode, value: oldValue}, '->', { mode: this.mode, value: this.value });

        if (this.persistent) {
            if (this.mode === 'manual') {
                localStorage.setItem(storageKey, this.value);
            } else {
                localStorage.removeItem(storageKey);
            }
        }

        if (this.mode !== 'disabled') {
            if (this.value !== oldValue || this.mode !== oldMode) {
                this.handlers.forEach(fn => fn(this.value, this.mode));
            }
        }

        if (this.mode === 'disabled' && instances.has(this)) {
            instances.delete(this);
            if (instances.size === 0) {
                detach();
            }
        } else if (this.mode !== 'disabled' && !instances.has(this)) {
            instances.add(this);
            if (instances.size === 1) {
                attach();
            }
        }
    }

    toggle(useAutoForManual) {
        switch (this.mode) {
            case 'auto':
                this.set(prefersDarkModeMedia.matches ? false : true);
                break;

            case 'manual':
                this.set(useAutoForManual && this.value !== prefersDarkModeMedia.matches ? 'auto' : !this.value);
                break;
        }
    }
}
