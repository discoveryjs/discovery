/* eslint-env browser */

import Dict from './dict.js';
import Publisher from './publisher.js';
import { createElement } from './utils/dom.js';
import ViewRenderer from './view.js';

type PageOptions = {
    reuseEl?: boolean;
    init?(newPageEl: HTMLElement): void;
    keepScrollOffset?: boolean;
};
type Page = {
    name: string;
    render(el: HTMLElement, data: any, context: any): any;
    options?: PageOptions;
    [CONFIG]?: any;
};

const CONFIG = Symbol('config');
const BUILDIN_NOT_FOUND: Page = {
    name: 'not-found',
    render: (el, { name }) => {
        el.style.cssText = 'color:#a00';
        el.innerText = `Page \`${name}\` not found`;
    }
};

export default class PageRenderer extends Dict<Page> {
    view: ViewRenderer;
    lastPage: string | null;
    lastPageRef: string | null;
    pageOverscrolled: Publisher<boolean>;
    setPageOverscroll: (el: HTMLElement) => void;

    constructor(host) {
        super();

        this.view = host.view;
        this.lastPage = null;
        this.lastPageRef = null;

        this.pageOverscrolled = new Publisher<boolean>(false);
        this.setPageOverscroll = () => {};

        if (typeof IntersectionObserver === 'function') {
            const pageOverscrollTriggerEl = createElement('div', { style: 'position:absolute' });
            const root = host.dom.content;
            let overscrollObserver = null;
            let unsubscribe = () => {};

            if (overscrollObserver) {
                overscrollObserver.disconnect();
                overscrollObserver = null;
            }

            if (root) {
                overscrollObserver = new IntersectionObserver(
                    entries =>
                        this.pageOverscrolled.set(!entries[entries.length - 1].isIntersecting),
                    { root }
                );

                this.setPageOverscroll = (newPageEl: HTMLElement) => {
                    overscrollObserver.unobserve(pageOverscrollTriggerEl);
                    unsubscribe();

                    if (newPageEl) {
                        newPageEl.prepend(pageOverscrollTriggerEl);
                        overscrollObserver.observe(pageOverscrollTriggerEl);
                        unsubscribe = this.pageOverscrolled.subscribeSync(overscrolled =>
                            newPageEl.classList.toggle('page_overscrolled', overscrolled)
                        );
                    }
                };
            }
        }
    }

    define(name: string, render: Page, options?: PageOptions) {
        super.define(name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this.view)
                : (el: HTMLElement, data: any, context: any) => this.view.render(el, render, data, context),
            options: Object.freeze({ ...options }),
            [CONFIG]: render
        }));
    }

    render(prevPageEl: HTMLElement, name: string, data, context) {
        const renderStartTime = Date.now();
        let page = this.get(name);
        let rendered;

        if (!page) {
            page = this.get('not-found') || BUILDIN_NOT_FOUND;
            data = { name };
        }

        const { reuseEl, init, keepScrollOffset = true } = page.options || {};
        const pageChanged = this.lastPage !== name;
        const pageRef = context && context.id;
        const pageRefChanged = this.lastPageRef !== pageRef;
        const newPageEl = reuseEl && !pageChanged ? prevPageEl : document.createElement('article');
        const parentEl = prevPageEl.parentNode as HTMLElement;

        this.lastPage = name;
        this.lastPageRef = pageRef;
        newPageEl.id = prevPageEl.id;
        newPageEl.classList.add('page', 'page-' + name);

        if (pageChanged && typeof init === 'function') {
            init(newPageEl);
        }

        try {
            rendered = page.render(newPageEl, data, context);
        } catch (e) {
            // FIXME: Should not to use a view (alert-danger) since it may to be undefined. Replace render with onError hook?
            rendered = this.view.render(newPageEl, 'alert-danger', String(e) + ' (see details in console)');
            console.error(e);
        }

        if (pageChanged || pageRefChanged || !keepScrollOffset) {
            parentEl.scrollTop = 0;
        }

        if (newPageEl !== prevPageEl) {
            prevPageEl.replaceWith(newPageEl);
            this.setPageOverscroll(newPageEl);
        }

        return {
            pageEl: newPageEl,
            config: page[CONFIG],
            renderState: Promise.resolve(rendered).then(() =>
                console.log('[Discovery] Page `' + page.name + '` rendered in ' + (Date.now() - renderStartTime) + 'ms')
            )
        };
    }
}
