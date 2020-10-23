import Emitter from '../emitter.js';

function getStorage(type) {
    const key = '__storage_test__' + Math.random();
    let storage;

    try {
        storage = window[type];
    } catch(e) {
        return null;
    }

    try {
        storage.setItem(key, key);
        storage.removeItem(key);
    } catch(e) {
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

function getStorageMap(type) {
    const map = new Map();

    map.storage = getStorage(type);
    map.getOrCreate = key => map.get(key) || createPersistentKey(key, map);
    map.getOrCreate.available = map.storage !== null;

    return map;
}

const storages = new Map([
    ['session', getStorageMap('sessionStorage')],
    ['local', getStorageMap('localStorage')]
]);

export const sessionStorageEntry = storages.get('session').getOrCreate;
export const localStorageEntry = storages.get('local').getOrCreate;

addEventListener('storage', (e) => {
    for (const [, map] of storages) {
        if (map.storage === e.storageArea && map.has(e.key)) {
            map.get(e.key).forceSync();
        }
    }
});

function createPersistentKey(key, map) {
    let currentValue = null;
    const emitter = new Emitter();
    const updateCurrentValue = (newValue = map.storage.getItem(key)) => {
        if (currentValue !== newValue) {
            emitter.emit('change', currentValue = newValue);
        }
    };
    const api = {
        get value() {
            return this.get();
        },
        get() {
            return currentValue;
        },
        set(value) {
            if (map.storage) {
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

