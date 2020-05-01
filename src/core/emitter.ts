interface Handler {
    callback: () => any;
    next: Handler;
}

export default class Emitter {
    listeners: {
        [event: string]: Handler;
    };

    constructor() {
        this.listeners = Object.create(null);
    }

    on(event: string, callback: (...args: any) => any): this {
        this.listeners[event] = {
            callback,
            next: this.listeners[event] || null
        };

        return this;
    }

    once(event: string, callback: (...args: any) => any): this {
        return this.on(event, function wrapper(...args) {
            callback.apply(this, args);
            this.off(event, wrapper);
        });
    }

    off(event: string, callback: (...args: any) => any): this {
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

    emit(event: string, ...args: any[]): boolean {
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
