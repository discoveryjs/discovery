/* eslint-env browser */
import { localStorageEntry, PersistentKey } from './utils/persistent.js';

export type Value = true | false | 'auto' | 'disabled' | 'only';
export type InitValue = Value | 'off' | 'disable';
export type Mode = 'manual' | Extract<Value, string>;
export type Handler = (value: boolean, mode: Mode) => void;

const validValues = new Set<Value>([true, false, 'auto', 'disabled', 'only']);
const instances = new Set<DarkModeController>();
const prefersDarkModeMedia = matchMedia('(prefers-color-scheme:dark)');
const persistentStorage = localStorageEntry('discoveryjs:darkmode');
const persistentStorageValueMapping = new Map<string, Value>([
    ['true', true],
    ['false', false],
    ['auto', 'auto']
]);
let persistentStorageValue: Value | null = null;

function applyPrefersColorScheme() {
    for (const instance of instances) {
        if (instance.mode === 'auto') {
            instance.set('auto');
        }
    }
}

function applyLocalStorageValue(value: string | null) {
    const newValue = persistentStorageValueMapping.get(value as any) ?? null;

    if (persistentStorageValue !== newValue) {
        persistentStorageValue = newValue;
        for (const instance of instances) {
            if (instance.persistent && instance.mode !== 'disabled' && instance.mode !== 'only') {
                instance.set(newValue !== null ? newValue : 'auto');
            }
        }
    }
}

// attach to changes
applyLocalStorageValue(persistentStorage.value);
persistentStorage.on(applyLocalStorageValue);
prefersDarkModeMedia.addListener(applyPrefersColorScheme); // Safari doesn't support for addEventListener()

function resolveInitValue(value: InitValue, persistent: boolean): Value {
    if (value === 'off' || value === 'disable' || !validValues.has(value)) {
        value = 'disabled';
    }

    // use value from a localStorage when persistent
    if (value !== 'disabled' && value !== 'only' && persistent && persistentStorageValue !== null) {
        value = persistentStorageValue;
    }

    return value;
}

function resolveSetValue(value: Value) {
    if (!validValues.has(value)) {
        value = 'disabled';
    }

    switch (value) {
        case 'only': return true;
        case 'auto': return prefersDarkModeMedia.matches;
        default:
            return value === true;
    }
}

export function resolveDarkmodeValue(value: InitValue = 'disabled', persistent = false) {
    return resolveSetValue(resolveInitValue(value, persistent));
}

// input value | controller internal state
//             | -------------------------
//             | mode     | value
// =========== | ======== | ==============
// 'disabled'  | disabled | false
// 'only'      | only     | true
// 'auto'      | auto     | [depends on prefers-color-scheme]
// false       | manual   | false
// true        | manual   | true

export class DarkModeController {
    persistent: PersistentKey | null;
    handlers: Array<{ fn: Handler }>;
    value: boolean;
    mode: Mode;

    constructor(value: InitValue, persistent = false) {
        this.persistent = persistent ? persistentStorage : null;
        this.handlers = [];
        this.set(resolveInitValue(value, persistent), true);

        instances.add(this);
    }

    subscribe(fn: Handler, fire = false) {
        let entry: { fn: Handler } | null = { fn };
        this.handlers.push(entry);

        if (fire) {
            entry.fn(this.value, this.mode);
        }

        return () => {
            const index = entry !== null ? this.handlers.indexOf(entry) : -1;
            entry = null;

            if (index !== -1) {
                this.handlers.splice(index, 1);
            }
        };
    }

    destroy() {
        instances.delete(this);
    }

    set(value: Value, init = false) {
        const prevValue = this.value;
        const prevMode = this.mode;

        if (!validValues.has(value)) {
            console.warn(`Bad value "${value}" for darkmode, ${init ? 'fallback to "disabled"' : 'ignored'}`);
            value = 'disabled';
        }

        if (!init && (prevMode === 'disabled' || value === 'disabled' || prevMode === 'only' || value === 'only')) {
            return;
        }

        this.mode = typeof value === 'boolean' ? 'manual' : value;
        this.value = resolveSetValue(value);

        if (this.mode !== 'disabled') {
            if (this.persistent && !init) {
                this.persistent.set(this.mode === 'auto' ? 'auto' : this.value);
            }

            if (this.value !== prevValue || this.mode !== prevMode) {
                this.handlers.forEach(({ fn }) => fn(this.value, this.mode));
            }
        }
    }

    toggle(useAutoForManual = false) {
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
