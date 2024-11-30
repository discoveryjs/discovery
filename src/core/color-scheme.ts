/* eslint-env browser */
import { getLocalStorageEntry, getLocalStorageValue, type PersistentStorageEntry } from './utils/persistent.js';

export type SerializedColorSchemeValue = typeof colorSchemeSerializedValues[number];
export type ColorSchemeValue = 'light' | 'dark';
export type ColorSchemeState = typeof colorSchemeStateValues[number];
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

export const persistentKey = 'discoveryjs:color-scheme';
export const colorSchemeSerializedValues = /* #__PURE__ */ Object.freeze([
    'auto',
    'light',
    'dark'
] as const);
export const colorSchemeStateValues = /* #__PURE__ */ Object.freeze([
    'auto',
    'light',
    'dark',
    'light-only',
    'dark-only'
] as const);

function isSerializedValue(value: unknown): value is SerializedColorSchemeValue {
    return colorSchemeSerializedValues.includes(value as SerializedColorSchemeValue);
}

function isColorSchemeDark() {
    return matchMedia('(prefers-color-scheme:dark)');
}

function resolveState(value: ColorSchemeStateWithLegacy, persistent: boolean): ColorSchemeState {
    const inputValue = value;

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

    if (inputValue !== value) {
        console.warn(`Used legacy value "${inputValue}" for ColorShemeController, value replaced for "${value}"`);
    }

    // use value from a storage when persistent and switching values is not disabled
    if (value !== 'light-only' && value !== 'dark-only' && persistent) {
        const persistentValue = getLocalStorageValue(persistentKey);

        if (isSerializedValue(persistentValue)) {
            value = persistentValue;
        }
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
            return check;
    }

}

function resolveValue(state: ColorSchemeState): ColorSchemeValue {
    const serializedState = serializeColorSchemeState(state);

    if (serializedState === 'auto') {
        return isColorSchemeDark().matches ? 'dark' : 'light';
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

export function resolveColorSchemeValue(value: ColorSchemeState = 'auto', persistent = false) {
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
    #persistent: PersistentStorageEntry<SerializedColorSchemeValue> | null;
    #persistentUnsubscribe: (() => void) | undefined;
    #mediaQueryUnsubscribe: (() => void) | undefined;
    #handlers: Array<{ fn: ColorSchemeChangeHandler }>;
    #state: ColorSchemeState;
    #value: ColorSchemeValue;

    persistent: boolean;
    state: ColorSchemeState;
    value: ColorSchemeValue;
    serializedValue: SerializedColorSchemeValue;
    mode: ColorSchemeMode;

    constructor(value: ColorSchemeState = 'auto', persistent = false) {
        this.#persistent = persistent ? getLocalStorageEntry(persistentKey) : null;
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

        // attach to changes
        this.#persistentUnsubscribe = this.#persistent?.subscribe((value) => {
            if (isSerializedValue(value) && value !== this.serializedValue && this.mode !== 'only') {
                this.set(value);
            }
        });
        this.#mediaQueryUnsubscribe = () => {
            const mediaQuery = isColorSchemeDark();
            const mediaQueryListener = () => { // Safari doesn't support for addEventListener()
                if (this.state === 'auto') {
                    this.set('auto');
                }
            };

            mediaQuery.addEventListener('change', mediaQueryListener);
            return () => mediaQuery.removeEventListener('change', mediaQueryListener);
        };
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
        this.#persistentUnsubscribe?.();
        this.#persistentUnsubscribe = undefined;
        this.#mediaQueryUnsubscribe?.();
        this.#mediaQueryUnsubscribe = undefined;
    }

    set(state: ColorSchemeState) {
        const prevSerializedValue = this.serializedValue;
        const prevValue = this.#value;
        const prevState = this.#state;

        if (!colorSchemeStateValues.includes(state)) {
            console.warn(`Bad value "${state}" for ColorScheme#state, value ignored`);
            return;
        }

        this.#state = state;
        this.#value = resolveValue(state);

        if (this.serializedValue !== prevSerializedValue) {
            this.#persistent?.set(this.serializedValue);
        }

        if (this.#state !== prevState || this.#value !== prevValue) {
            this.#handlers.forEach(({ fn }) => fn(this.#value, this.#state));
        }
    }

    toggle(useAutoForManual = false) {
        switch (this.#state) {
            case 'auto':
                this.set(isColorSchemeDark().matches ? 'dark' : 'light');
                return;

            case 'dark':
                this.set(useAutoForManual && !isColorSchemeDark().matches ? 'auto' : 'light');
                return;

            case 'light':
                this.set(useAutoForManual && isColorSchemeDark().matches ? 'auto' : 'dark');
                return;
        }

        console.warn(`ColorScheme is locked for changes (mode=${this.#state})`);
    }
}
