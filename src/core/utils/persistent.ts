import { Emitter } from '../emitter.js';

export type StorageType = 'localStorage' | 'sessionStorage';
export type StorageMap = Map<string, PersistentKey> & {
    storage: Storage | null;
    getOrCreate: PersistentKeyGetOrCreate;
};
export type PersistentValue = string | null;
export type PersistentKey<V extends string = string> = {
    readonly value: PersistentValue,
    get(): PersistentValue,
    set(value: V): void;
    delete(): void;
    forceSync(): PersistentValue;
    on(fn: (value: PersistentValue) => void, fire?: boolean): () => void;
    off(fn: (value: PersistentValue) => void): void;
};
export type PersistentKeyEvents = {
    change: [value: PersistentValue];
    foo: [];
}
export type PersistentKeyGetOrCreate = ((key: string) => PersistentKey) & {
    available: boolean;
};

function getStorage(type: StorageType): Storage | null {
    const key = '__storage_test__' + Math.random();
    let storage: Storage;

    try {
        storage = window[type];
    } catch {
        return null;
    }

    try {
        storage.setItem(key, key);
        storage.removeItem(key);
    } catch (e) {
        const ok = e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;

        if (!ok) {
            return null;
        }
    }

    return storage;
}

function getStorageMap(type: StorageType): StorageMap {
    const storage = getStorage(type);
    const map = Object.assign(new Map(), {
        storage,
        getOrCreate: Object.assign((key: string) => map.get(key) || createPersistentKey(key, map), {
            available: storage !== null
        })
    });

    return map;
}

const sessionStorageMap = getStorageMap('sessionStorage');
const localStorageMap = getStorageMap('localStorage');
const storages = new Map([
    ['session', sessionStorageMap],
    ['local', localStorageMap]
]);

export const sessionStorageEntry = sessionStorageMap.getOrCreate;
export const localStorageEntry = localStorageMap.getOrCreate;

addEventListener('storage', (e) => {
    for (const [, map] of storages) {
        if (map.storage === e.storageArea) {
            const persistentKey = map.get(e.key as string);

            if (persistentKey) {
                persistentKey.forceSync();
            }
        }
    }
});

function createPersistentKey(key: string, map: StorageMap) {
    let currentValue: PersistentValue = null;
    const emitter = new Emitter<PersistentKeyEvents>(); // TODO: Change for Publisher
    const updateCurrentValue = (newValue: PersistentValue = map.storage?.getItem(key) ?? null) => {
        if (currentValue !== newValue) {
            emitter.emit('change', currentValue = newValue);
        }
    };
    const api: PersistentKey = {
        get value() {
            return this.get();
        },
        get() {
            return currentValue;
        },
        set(value) {
            if (map.storage && value !== currentValue) {
                map.storage.setItem(key, value);
                updateCurrentValue();
            }
        },
        delete() {
            if (map.storage) {
                map.storage.removeItem(key);
                updateCurrentValue();
            }
        },
        forceSync() {
            if (map.storage) {
                updateCurrentValue();
            }

            return this.get();
        },
        on(fn, fire) {
            emitter.on('change', fn);

            if (fire) {
                fn(currentValue);
            }

            return () => emitter.off('change', fn);
        },
        off(fn) {
            emitter.off('change', fn);
        }
    };

    map.set(key, api);
    api.forceSync();

    return api;
}

