import { Observer } from '../observer.js';

export type StorageType = 'localStorage' | 'sessionStorage';
export const getSessionStorageEntry = /* #__PURE__ */ createStorageEntryFactory('sessionStorage');
export const getSessionStorageValue = /* #__PURE__ */ createStorageReader('sessionStorage');
export const getLocalStorageEntry = /* #__PURE__ */ createStorageEntryFactory('localStorage');
export const getLocalStorageValue = /* #__PURE__ */ createStorageReader('localStorage');

const storageMaps = new Map();

function createStorageEntryFactory(type: StorageType) {
    const storage = getStorage(type);
    const map = new Map<string, PersistentStorageEntry>();

    return function getOrCreateStorageEntry<T extends string>(key: string) {
        let persistentKey = map.get(key);

        if (persistentKey === undefined) {
            persistentKey = new PersistentStorageEntry<T>(storage, key);
            map.set(key, persistentKey);
            registerStorageMap(storage, map);
        }

        return persistentKey as PersistentStorageEntry<T>;
    };
}

function createStorageReader(type: StorageType) {
    const storage = getStorage(type);

    return function getStorageValue(key: string) {
        return storage?.getItem(key) ?? null;
    };
}

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

function registerStorageMap(storage: Storage | null, map: Map<string, PersistentStorageEntry>) {
    if (storage !== null && !storageMaps.has(storage)) {
        storageMaps.set(storage, map);

        if (storageMaps.size === 1) {
            addEventListener('storage', (e) => {
                const map = storageMaps.get(e.storageArea);

                if (map !== undefined) {
                    const persistentKey = map.get(e.key as string);

                    if (persistentKey) {
                        persistentKey.forceSync();
                    }
                }
            });
        }
    }
}

export class PersistentStorageEntry<V extends string = string> extends Observer<V | null> {
    #storage: Storage | null;
    #key: string;

    constructor(storage: Storage | null, key: string) {
        super(storage?.getItem(key) as V ?? null);

        this.#storage = storage;
        this.#key = key;
    }

    #readStorageValue(): V | null {
        return (this.#storage?.getItem(this.#key) as V) ?? null;
    }

    get storage() {
        return this.#storage;
    }

    get key() {
        return this.#key;
    }

    get() {
        return this.value;
    }
    set(value: V) {
        if (this.#storage) {
            const storageValue = this.#readStorageValue();

            if (value !== storageValue) {
                this.#storage.setItem(this.#key, value);
                return super.set(value);
            }
        }

        return false;
    }

    delete() {
        if (this.#storage) {
            this.#storage.removeItem(this.#key);
        }
    }

    forceSync() {
        if (this.#storage) {
            return super.set(this.#readStorageValue());
        }

        return false;
    }
}
