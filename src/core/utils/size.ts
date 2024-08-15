import { Observer } from '../observer.js';

const resizeObserverSupported = typeof ResizeObserver === 'function';

export class ContentRect extends Observer<DOMRectReadOnly | null> {
    private el: HTMLElement | null;
    private observer: ResizeObserver | null;

    constructor() {
        super(null);

        this.el = null;
        this.observer = resizeObserverSupported
            ? new ResizeObserver(entries => {
                for (const entry of entries) {
                    this.set(entry.contentRect);
                }
            })
            : null;
    }

    observe(el: HTMLElement) {
        if (this.observer === null) {
            this.el = null;
            return;
        }

        el = el || null;

        if (this.el !== el) {
            if (this.el !== null) {
                this.observer.unobserve(this.el);
            }

            if (el !== null) {
                this.observer.observe(el);
            }

            this.el = el;
        }
    }

    dispose() {
        this.el = null;
        this.observer = null;
    }
}
