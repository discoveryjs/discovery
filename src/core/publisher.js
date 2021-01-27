export default class Publisher {
    static setValue(publisher, value) {
        if (!publisher.shouldPublish(value, publisher.value)) {
            return false;
        }

        const callbacks = [];
        let cursor = publisher.subscriber;
        publisher.value = value;

        // search for a callback and remove it
        while (cursor !== null) {
            const { callback, thisArg } = cursor;

            if (callback !== null) {
                callbacks.push(callback.call(thisArg, value, () => publisher.unsubscribe(callback, thisArg)));
            }

            cursor = cursor.subscriber;
        }

        return callbacks;
    }

    constructor(initValue, shouldPublish) {
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

    subscribe(callback, thisArg) {
        this.subscriber = {
            callback,
            thisArg,
            subscriber: this.subscriber
        };

        return () => this.unsubscribe(callback, thisArg);
    }

    subscribeSync(callback, thisArg) {
        const unsubscribe = this.subscribe(callback, thisArg);

        // sync
        callback.call(thisArg, this.value, unsubscribe);

        return unsubscribe;
    }

    unsubscribe(callback, thisArg) {
        let prev = this;
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

    shouldPublish(newValue, oldValue) {
        return newValue !== oldValue;
    }

    set(value) {
        return this.constructor.setValue(this, value) !== false;
    }

    asyncSet(value) {
        const callbacks = this.constructor.setValue(this, value);

        return callbacks === false
            ? Promise.resolve(false)
            : Promise.all(callbacks).then(res => res !== false);
    }
}
