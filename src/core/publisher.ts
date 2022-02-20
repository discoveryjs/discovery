type Callback<T> = (value: T, unsubscribe: () => void) => any;
type Subscriber<T> = {
    callback: Callback<T>;
    thisArg: any;
    subscriber: Subscriber<T> | null;
};

export default class Publisher<T> {
    value: T;
    subscriber: Subscriber<T>;

    constructor(initValue: T, shouldPublish?: (newValue: T, oldValue: T) => boolean) {
        this.value = initValue;
        this.shouldPublish = typeof shouldPublish === 'function' ? shouldPublish : this.shouldPublish;
        this.subscriber = null;
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

    subscribe(callback: Callback<T>, thisArg?: any) {
        this.subscriber = {
            callback,
            thisArg,
            subscriber: this.subscriber
        };

        return () => this.unsubscribe(callback, thisArg);
    }

    subscribeSync(callback: Callback<T>, thisArg?: any) {
        const unsubscribe = this.subscribe(callback, thisArg);

        // sync
        callback.call(thisArg, this.value, unsubscribe);

        return unsubscribe;
    }

    unsubscribe(callback: Callback<T>, thisArg?: any) {
        let prev: Subscriber<T> | this = this;
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

    shouldPublish(newValue: T, oldValue: T) {
        return newValue !== oldValue;
    }

    private setValue_(value: T) {
        if (!this.shouldPublish(value, this.value)) {
            return false;
        }

        const callbacks = [];
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

    set(value: T) {
        return this.setValue_(value) !== false;
    }

    asyncSet(value: T) {
        const callbacks = this.setValue_(value);

        return callbacks === false
            ? Promise.resolve(false)
            : Promise.all(callbacks).then(() => true);
    }
}
