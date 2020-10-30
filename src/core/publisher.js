export default class Publisher {
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
        const subscription = this.subscribe(callback, thisArg);

        // sync
        callback.call(thisArg, this.value);

        return subscription;
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
        if (!this.shouldPublish(value, this.value)) {
            return false;
        }

        let cursor = this.subscriber;
        this.value = value;

        // search for a callback and remove it
        while (cursor !== null) {
            if (cursor.callback !== null) {
                cursor.callback.call(cursor.thisArg, value);
            }

            cursor = cursor.subscriber;
        }

        return true;
    }
}
