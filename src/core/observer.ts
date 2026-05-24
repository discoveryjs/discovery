type OnChangeCallback<T> = (value: T, unsubscribe: () => void) => void | Promise<void>;
type Subscriber<T> = {
    callback: OnChangeCallback<T> | null;
    subscriber: Subscriber<T> | null;
}

export class Observer<T> {
    subscriber: Subscriber<T> | null;
    value: T;
    #readonly: {
        subscribe: Observer<T>['subscribe'];
        subscribeSync: Observer<T>['subscribeSync'];
        unsubscribe: Observer<T>['unsubscribe'];
        value: T;
    };

    constructor(initValue: T, shouldUpdate?: (a: T, b: T) => boolean) {
        this.subscriber = null;
        this.value = initValue;
        this.shouldUpdate = typeof shouldUpdate === 'function' ? shouldUpdate : this.shouldUpdate;

        const host = this;
        this.#readonly = Object.freeze({
            subscribe: this.subscribe.bind(this),
            subscribeSync: this.subscribeSync.bind(this),
            unsubscribe: this.unsubscribe.bind(this),
            get value() {
                return host.value;
            }
        });
    }

    get readonly() {
        return this.#readonly;
    }

    subscribe(callback: OnChangeCallback<T>) {
        this.subscriber = {
            callback,
            subscriber: this.subscriber
        };

        return () => this.unsubscribe(callback);
    }

    subscribeSync(callback: OnChangeCallback<T>) {
        const unsubscribe = this.subscribe(callback);

        // sync
        callback(this.value, unsubscribe);

        return unsubscribe;
    }

    unsubscribe(callback: OnChangeCallback<T>) {
        let prev: this | Subscriber<T> = this;
        let cursor = this.subscriber;

        while (cursor !== null) {
            if (cursor.callback === callback) {
                cursor.callback = null;
                prev.subscriber = cursor.subscriber;
                break;
            }

            prev = cursor;
            cursor = cursor.subscriber;
        }
    };

    shouldUpdate(newValue: T, oldValue: T): boolean {
        return newValue !== oldValue;
    }

    set(value: T): boolean {
        return this.#setValue(value) !== false;
    }

    asyncSet(value: T): Promise<boolean> {
        const callbacks = this.#setValue(value);

        return callbacks === false
            ? Promise.resolve(false)
            : Promise.all(callbacks).then(() => true);
    }

    #setValue(value: T) {
        if (!this.shouldUpdate(value, this.value)) {
            return false;
        }

        const callbacks: (void | Promise<void>)[] = [];
        let cursor = this.subscriber;
        this.value = value;

        // search for a callback and remove it
        while (cursor !== null) {
            const { callback } = cursor;

            if (callback !== null) {
                callbacks.push(callback(value, () => this.unsubscribe(callback)));
            }

            cursor = cursor.subscriber;
        }

        return callbacks;
    }
}
