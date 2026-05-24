import { Observer } from '../observer.js';

const storageMaps = new Map();
const storageEntryFactories = new WeakMap<Storage,(key: string) => PersistentStorageEntry>();

export type StorageType = 'localStorage' | 'sessionStorage';
export const getSessionStorageEntry = /* #__PURE__ */ createStorageEntryFactory(getStorage('sessionStorage'));
export const getSessionStorageValue = /* #__PURE__ */ createStorageReader('sessionStorage');
export const getLocalStorageEntry = /* #__PURE__ */ createStorageEntryFactory(getStorage('localStorage'));
export const getLocalStorageValue = /* #__PURE__ */ createStorageReader('localStorage');

export function createStorageEntryFactory(storage: Storage | null = null) {
    let getOrCreateStorageEntry = storage ? storageEntryFactories.get(storage) : undefined;

    if (getOrCreateStorageEntry === undefined) {
        const entryMap = new Map<string, PersistentStorageEntry>();

        getOrCreateStorageEntry = (key) => {
            let persistentKey = entryMap.get(key);

            if (persistentKey === undefined) {
                persistentKey = new PersistentStorageEntry(storage, key);
                entryMap.set(key, persistentKey);
                registerStorageMap(storage, entryMap);
            }

            return persistentKey;
        };;

        if (storage) {
            storageEntryFactories.set(storage, getOrCreateStorageEntry);
        }
    }

    return getOrCreateStorageEntry;
}

function createStorageReader(type: StorageType) {
    const storage = getStorage(type);

    return function getStorageValue(key: string) {
        return storage?.getItem(key) ?? null;
    };
}

export function getStorage(type: StorageType): Storage | null {
    const key = '__storage_test__' + Math.random();
    let storage: Storage;

    try {
        storage = globalThis[type];
    } catch {
        return null;
    }

    // Some environments (e.g. Node.js with no a flag) provides Storage but with no implementation
    if (!storage || 'getItem' in storage === false) {
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

export class FallbackStorage implements Storage {
    #storage = new Map<string, string>();
    length = 0;

    clear() {
        this.#storage.clear();
        this.length = 0;
    }
    getItem(key: string) {
        return this.#storage.get(key) ?? null;
    }
    key(index: number) {
        return Array.from(this.#storage.keys())[index] ?? null;
    }
    removeItem(key: string) {
        if (this.#storage.delete(key)) {
            this.length--;
        }
    }
    setItem(key: string, value: string) {
        if (!this.#storage.has(key)) {
            this.length++;
        }

        this.#storage.set(key, value);
    }
}

function registerStorageMap(storage: Storage | null, map: Map<string, PersistentStorageEntry>) {
    if (storage !== null && !storageMaps.has(storage)) {
        storageMaps.set(storage, map);

        if (storageMaps.size === 1 && typeof globalThis.addEventListener === 'function') {
            try {
                addEventListener('storage', (e) => {
                    const map = storageMaps.get(e.storageArea);

                    if (map !== undefined) {
                        const persistentKey = map.get(e.key as string);

                        if (persistentKey) {
                            persistentKey.forceSync();
                        }
                    }
                });
            } catch {
                // ignore, not all environments supports addEventListener (e.g. Node.js)
            }
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
