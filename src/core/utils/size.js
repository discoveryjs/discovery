import { Observer } from '../observer.js';

const resizeObserverSupported = typeof ResizeObserver === 'function';

export class ContentRect extends Observer {
    constructor() {
        super();
        this.el = null;

        if (resizeObserverSupported) {
            this.observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    this.set(entry.contentRect);
                }
            });
        }
    }

    observe(el) {
        el = el || null;

        if (this.observer && this.el !== el) {
            if (this.el !== null) {
                this.observer.unobserve(this.el);
            }

            if (el !== null) {
                this.observer.observe(el);
            }
        }

        this.el = el;
    }
}
