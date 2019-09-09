export default class Emitter {
    constructor() {
        this.listeners = Object.create(null);
    }

    on(event, callback) {
        this.listeners[event] = {
            callback,
            next: this.listeners[event] || null
        };

        return this;
    }

    once(event, callback) {
        return this.on(event, function wrapper(...args) {
            callback.apply(this, args);
            this.off(event, wrapper);
        });
    }

    off(event, callback) {
        let cursor = this.listeners[event];
        let prev = null;

        // search for a callback and remove it
        while (cursor) {
            if (cursor.callback === callback) {
                // make it non-callable
                cursor.callback = null;

                // remove from a list
                if (prev) {
                    prev.next = cursor.next;
                } else {
                    this.listeners[event] = cursor.next;
                }

                break;
            }

            prev = cursor;
            cursor = cursor.next;
        }

        return this;
    }

    emit(event, ...args) {
        let cursor = this.listeners[event];
        let hadListeners = false;

        while (cursor) {
            if (typeof cursor.callback === 'function') {
                cursor.callback.apply(this, args);
            }

            hadListeners = true;
            cursor = cursor.next;
        }

        return hadListeners;
    }
}
