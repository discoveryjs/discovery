import Publisher from '../publisher.js';

const resizeObserverSupported = typeof ResizeObserver === 'function';

export class ContentRect extends Publisher<DOMRectReadOnly | null> {
    private observer: ResizeObserver;
    private el: HTMLElement;

    constructor() {
        super(null);
        this.el = null;

        if (resizeObserverSupported) {
            this.observer = new ResizeObserver(entries => {
                this.set(entries[entries.length - 1]?.contentRect);
            });
        }
    }

    observe(el: HTMLElement) {
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
