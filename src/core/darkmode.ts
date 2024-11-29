/* eslint-env browser */
import { localStorageEntry, PersistentKey } from './utils/persistent.js';

export type SerializedColorSchemeValue = 'auto' | 'light' | 'dark';
export type ColorSchemeValue = 'light' | 'dark';
export type ColorSchemeState = 'auto' | 'light' | 'light-only' | 'dark' | 'dark-only';
export type ColorSchemeStateWithLegacy =
    | ColorSchemeState
    | true       // -> 'dark'
    | false      // -> 'light'
    | 'disabled' // -> 'light-only'
    | 'disable'  // -> 'light-only'
    | 'off'      // -> 'light-only'
    | 'only';    // -> 'dark-only'
export type ColorSchemeMode =
    | 'auto'     // auto detect color scheme based on prefers-color-scheme media (when init value is 'auto')
    | 'manual'   // allow to change value (when init value is 'light' or 'dark')
    | 'only';    // fixed value, can't be changed (when init value is 'light-only' or 'dark-only')
export type ColorSchemeChangeHandler = (value: ColorSchemeValue, state: ColorSchemeState) => void;

export const colorSchemeSetValues = Object.freeze(['auto', 'light', 'dark', 'light-only', 'dark-only'] satisfies ColorSchemeState[]);
const instances = new Set<ColorScheme>();
const prefersDarkModeMedia = matchMedia('(prefers-color-scheme:dark)');
const persistentStorage = localStorageEntry('discoveryjs:darkmode');
let persistentStorageValue: SerializedColorSchemeValue = 'auto';

function applyPrefersColorScheme() {
    for (const instance of instances) {
        if (instance.state === 'auto') {
            instance.set('auto');
        }
    }
}

function applyLocalStorageValue(value: string | null) {
    let newValue: SerializedColorSchemeValue | null = null;

    switch (value) {
        case 'false': // legacy
        case 'light':
            newValue = 'light';
            break;

        case 'true': // legacy
        case 'dark':
            newValue = 'dark';
            break;

        case 'auto':
        default:
            newValue = 'auto';
    }

    if (persistentStorageValue !== newValue) {
        persistentStorageValue = newValue;

        for (const instance of instances) {
            if (instance.persistent && instance.mode !== 'only') {
                instance.set(newValue);
            }
        }
    }
}

// attach to changes
applyLocalStorageValue(persistentStorage.value);
persistentStorage.on(applyLocalStorageValue);
prefersDarkModeMedia.addListener(applyPrefersColorScheme); // Safari doesn't support for addEventListener()

function resolveState(value: ColorSchemeStateWithLegacy, persistent: boolean): ColorSchemeState {
    // remap legacy values
    switch (value) {
        case true:
            value = 'dark';
            break;

        case false:
            value = 'light';
            break;

        case 'disabled':
        case 'disable':
        case 'off':
            value = 'light-only';
            break;

        case 'only':
            value = 'dark-only';
            break;
    }

    // use value from a storage when persistent and switching values is not disabled
    if (value !== 'light-only' && value !== 'dark-only' && persistent && persistentStorageValue !== null) {
        value = persistentStorageValue;
    }

    return value;
}

function resolveMode(value: ColorSchemeState): ColorSchemeMode {
    switch (value) {
        case 'light':
        case 'dark':
            return 'manual';

        case 'light-only':
        case 'dark-only':
            return 'only';

        case 'auto':
            return 'auto';

        default:
            const check: never = value;
            return check || 'auto';
    }

}

function resolveValue(state: ColorSchemeState): ColorSchemeValue {
    const serializedState = serializeColorSchemeState(state);

    if (serializedState === 'auto') {
        return prefersDarkModeMedia.matches ? 'dark' : 'light';
    }

    return serializedState;
}

export function serializeColorSchemeState(state: ColorSchemeState): SerializedColorSchemeValue {
    switch (state) {
        case 'auto':
            return 'auto';

        case 'dark':
        case 'dark-only':
            return 'dark';

        case 'light':
        case 'light-only':
        default:
            return 'light';
    }
}

export function resolveColorSchemeValue(value: ColorSchemeStateWithLegacy = 'auto', persistent = false) {
    return resolveValue(resolveState(value, persistent));
}

// input/state  | controller internal state
// value        |
//              | -------------------------
//              | state      | mode     | value
// ============ | ========== | ======== | ==============
// 'auto'       | auto       | auto     | 'light' or 'dark' [depends on prefers-color-scheme]
// 'dark'       | dark       | manual   | 'dark'
// 'dark-only'  | dark-only  | only     | 'dark'
// 'light       | light      | manual   | 'light'
// 'light-only' | light-only | only     | 'light'
// --- legacy -----------------------------------
// 'disabled'   | light-only | only     | 'light'
// 'only'       | dark-only  | only     | 'dark'
// 'auto'       | auto       | auto     | 'light' or 'dark' [depends on prefers-color-scheme]
// false        | light      | manual   | 'light'
// true         | dark       | manual   | 'dark'

export class ColorScheme {
    #persistent: PersistentKey<SerializedColorSchemeValue> | null;
    #handlers: Array<{ fn: ColorSchemeChangeHandler }>;
    #state: ColorSchemeState;
    #value: ColorSchemeValue;

    persistent: boolean;
    state: ColorSchemeState;
    value: ColorSchemeValue;
    serializedValue: SerializedColorSchemeValue;
    mode: ColorSchemeMode;

    constructor(value: ColorSchemeState = 'auto', persistent = false) {
        this.#persistent = persistent ? persistentStorage : null;
        this.#handlers = [];
        this.#state = resolveState(value, persistent);
        this.#value = resolveValue(this.#state);

        // this way properties will be available in jora queries
        Object.defineProperties(this, {
            persistent: { get: () => this.#persistent !== null },
            state: { get: () => this.#state },
            value: { get: () => this.#value },
            serializedValue: { get: () => serializeColorSchemeState(this.#state) },
            mode: { get: () => resolveMode(this.#state) }
        });

        instances.add(this);
    }

    subscribe(fn: ColorSchemeChangeHandler, fire = false) {
        let entry: { fn: ColorSchemeChangeHandler } | null = { fn };
        this.#handlers.push(entry);

        if (fire) {
            entry.fn(this.#value, this.#state);
        }

        return () => {
            const index = entry !== null ? this.#handlers.indexOf(entry) : -1;
            entry = null;

            if (index !== -1) {
                this.#handlers.splice(index, 1);
            }
        };
    }

    destroy() {
        instances.delete(this);
    }

    set(state: ColorSchemeState) {
        const prevState = this.#state;

        if (prevState === 'light-only' || prevState === 'dark-only') {
            console.warn(`DarkModeController is locked for changes (state=${prevState})`);
            return;
        }

        if (!colorSchemeSetValues.includes(state)) {
            console.warn(`Bad value "${state}" for darkmode, value ignored`);
            return;
        }

        if (this.#state !== state) {
            this.#state = state;
            this.#value = resolveValue(state);

            if (this.#persistent) {
                this.#persistent.set(serializeColorSchemeState(this.#state));
            }

            this.#handlers.forEach(({ fn }) => fn(this.#value, this.#state));
        }
    }

    toggle(useAutoForManual = false) {
        switch (this.#state) {
            case 'auto':
                this.set(prefersDarkModeMedia.matches ? 'dark' : 'light');
                return;

            case 'dark':
                this.set(useAutoForManual && !prefersDarkModeMedia.matches ? 'auto' : 'light');
                return;

            case 'light':
                this.set(useAutoForManual && prefersDarkModeMedia.matches ? 'auto' : 'dark');
                return;
        }

        console.warn(`DarkModeController is locked for changes (mode=${this.#state})`);
    }
}
