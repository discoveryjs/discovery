type OnChangeCallback<T> = (value: T, unsubscribe?: () => void) => void | Promise<void>;
type Subscriber<T> = {
    callback: OnChangeCallback<T> | null;
    thisArg?: any;
    subscriber: Subscriber<T> | null;
}

export class Observer<T> {
    subscriber: Subscriber<T> | null;
    value: T;

    constructor(initValue: T, shouldUpdate?: (a: T, b: T) => boolean) {
        this.subscriber = null;
        this.value = initValue;
        this.shouldUpdate = typeof shouldUpdate === 'function' ? shouldUpdate : this.shouldUpdate;
    }

    get readonly() {
        const host = this;

        return {
            subscribe: this.subscribe.bind(this),
            subscribeSync: this.subscribeSync.bind(this),
            unsubscribe: this.unsubscribe.bind(this),
            get value() {
                return host.value;
            }
        };
    }

    subscribe(callback: OnChangeCallback<T>, thisArg: any) {
        this.subscriber = {
            callback,
            thisArg,
            subscriber: this.subscriber
        };

        return () => this.unsubscribe(callback, thisArg);
    }

    subscribeSync(callback: OnChangeCallback<T>, thisArg: any) {
        const unsubscribe = this.subscribe(callback, thisArg);

        // sync
        callback.call(thisArg, this.value, unsubscribe);

        return unsubscribe;
    }

    unsubscribe(callback: OnChangeCallback<T>, thisArg: any) {
        let prev: this | Subscriber<T> = this;
        let cursor = this.subscriber;

        while (cursor !== null) {
            if (cursor.callback === callback && cursor.thisArg === thisArg) {
                cursor.callback = null;
                cursor.thisArg = null;
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
            const { callback, thisArg } = cursor;

            if (callback !== null) {
                callbacks.push(callback.call(thisArg, value, () => this.unsubscribe(callback, thisArg)));
            }

            cursor = cursor.subscriber;
        }

        return callbacks;
    }
}
