/* eslint-env browser */

import { Dictionary } from './dict.js';
import { Model } from '../main/model.js';
import { FallbackStorage, getStorage, createStorageEntryFactory, PersistentStorageEntry } from './utils/storage.js';

export type ValueConfig = {
    storage: 'local' | 'session';
    raw: boolean;
    defaultValue: any;
};
export type ValueDefinition = {
    name: string;
    entry: ValueStorageEntry<any>;
} & ValueConfig;

type OnChangeCallback<T> = (newValue: T, unsubscribe: () => void) => void;
class ValueStorageEntry<T> {
    #entry: PersistentStorageEntry;
    #lastStorageValue: string | null = null;
    #lastValue: T;
    #subscribers = new WeakMap<OnChangeCallback<T>,() => void>();
    #defaultValue: T;
    #raw: boolean;

    constructor(entry: PersistentStorageEntry, defaultValue: T, raw = false) {
        this.#entry = entry;
        this.#defaultValue = defaultValue;
        this.#raw = raw;
    }

    #resolveValue(value: string | null): T {
        if (value === null) {
            return this.#defaultValue;
        }

        return this.#raw ? value as unknown as T : JSON.parse(value);
    }

    get value(): T {
        const storageValue = this.#entry.get();

        if (this.#lastStorageValue !== storageValue) {
            this.#lastStorageValue = storageValue;
            this.#lastValue = this.#resolveValue(storageValue);
        }

        return this.#lastValue;
    }
    set value(value: T) {
        const nextValue = this.#raw ? value : JSON.stringify(value);

        if (typeof nextValue === 'string') {
            this.#entry.set(nextValue);
        } else if (nextValue === null || nextValue === undefined) {
            this.#entry.delete();
        }
    }

    subscribe(callback: OnChangeCallback<T>) {
        let unsubscribe = this.#subscribers.get(callback);

        if (unsubscribe === undefined) {
            unsubscribe = this.#entry.subscribe((newValue: string | null) => {
                callback(this.#resolveValue(newValue), unsubscribe as () => void);
            });
            this.#subscribers.set(callback, unsubscribe);
        }

        return unsubscribe;
    }
    subscribeSync(callback: OnChangeCallback<T>) {
        const unsubscribe = this.subscribe(callback);

        callback(this.value, unsubscribe);

        return unsubscribe;
    }
    unsubscribe(callback: OnChangeCallback<T>) {
        const unsubscribe = this.#subscribers.get(callback);

        if (unsubscribe) {
            unsubscribe();
            this.#subscribers.delete(callback);
        }
    }
}

export class ValueStorage extends Dictionary<ValueDefinition> {
    #host: Model;
    #storages = {
        local: getStorage('localStorage') || new FallbackStorage(),
        session: getStorage('sessionStorage') || new FallbackStorage()
    };
    #entryMap = {
        local: createStorageEntryFactory(this.#storages.local),
        session: createStorageEntryFactory(this.#storages.session)
    };

    constructor(host: Model) {
        super();

        this.#host = host;
    }

    define(name: string, config: Partial<ValueConfig>): ValueDefinition {
        if (this.has(name)) {
            throw new Error(`Storage value "${name}" is already defined`);
        }

        const {
            storage = 'local',
            defaultValue = null,
            raw = false
        } = config;
        const entry = new ValueStorageEntry(
            this.#entryMap[storage](name),
            defaultValue,
            raw
        );

        return ValueStorage.define(this, name, Object.freeze({
            name,
            storage,
            raw,
            defaultValue,
            entry
        }));
    }

    getOrError(name: string) {
        const def = this.get(name);

        if (!def) {
            throw new Error(`Storage value "${name}" is not defined`);
        }

        return def;
    }

    getEntry(name: string) {
        return this.getOrError(name).entry;
    }

    getValue(name: string) {
        return this.getEntry(name).value;
    }

    setValue(name: string, value: any) {
        this.getEntry(name).value = value;
    }

    storageDetails() {
        Object.entries(this.#storages).map(([name, storage]) => {
            return {
                name,
                native: storage instanceof FallbackStorage === false,
                items: [...this.values]
                    .filter((def) => def.storage === name)
                    .map(def => def.name)
            };
        });
    }
}
