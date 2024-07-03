export type EventMap = Record<string, unknown[]>;
export type Callback<P extends unknown[]> = (...args: P) => void;
export type Listener<P extends unknown[]> = {
    callback: Callback<P> | null;
    next: Listener<P> | null;
};

export default class Emitter<Events extends EventMap> {
    listeners: {
        [EventName in keyof Events]: Listener<Events[EventName]> | null;
    };

    constructor() {
        this.listeners = Object.create(null);
    }

    on<E extends keyof Events>(event: E, callback: Callback<Events[E]>) {
        this.listeners[event] = {
            callback,
            next: this.listeners[event] || null
        };

        return this;
    }

    once<E extends keyof Events>(event: E, callback: Callback<Events[E]>) {
        return this.on(event, function wrapper(...args) {
            callback.apply(this, args);
            this.off(event, wrapper);
        } as Callback<Events[E]>);
    }

    off<E extends keyof Events>(event: E, callback: Callback<Events[E]>) {
        let cursor = this.listeners[event] || null;
        let prev: Listener<Events[E]> | null = null;

        // search for a callback and remove it
        while (cursor !== null) {
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

    emit<E extends keyof Events>(event: E, ...args: Events[E]) {
        let cursor = this.listeners[event] || null;
        let hadListeners = false;

        while (cursor !== null) {
            if (typeof cursor.callback === 'function') {
                cursor.callback.apply(this, args);
            }

            hadListeners = true;
            cursor = cursor.next;
        }

        return hadListeners;
    }
}
