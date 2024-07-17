/* eslint-env browser */

import Dict from './dict.js';
import { Observer } from './observer.js';
import { createElement } from './utils/dom.js';
import type ViewRenderer from './view.js';
import type { RawViewConfig } from './view.js';
import type { Widget, PageParams } from '../main/index.js';

export type PageOptionName = keyof PageOptions;
export type PageOptions = {
    reuseEl: boolean;
    init(newPageEl: HTMLElement): void;
    keepScrollOffset: boolean;
    encodeParams(params: PageParams): [string, any][] | string;
    decodeParams(params: [string, string | boolean][]): Record<string, unknown>;
};
export type Page = {
    name: string;
    render(el: HTMLElement, data: any, context: any): any;
    options?: Partial<PageOptions>;
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
    #host: Widget;
    #view: ViewRenderer;
    lastPage: string | null;
    lastPageRef: string | null;
    pageOverscrolled: Observer<boolean>;
    setPageOverscroll: (el: HTMLElement) => void;

    constructor(host: Widget, view: ViewRenderer) {
        super();

        this.#host = host;
        this.#view = view;
        this.lastPage = null;
        this.lastPageRef = null;

        this.pageOverscrolled = new Observer(false);
        this.setPageOverscroll = () => {};

        if (typeof IntersectionObserver === 'function') {
            const pageOverscrollTriggerEl = createElement('div', { style: 'position:absolute' });
            const root: HTMLElement | null = host.dom?.content || null;
            let unsubscribe = () => {};

            if (root !== null) {
                const overscrollObserver = new IntersectionObserver(
                    entries =>
                        this.pageOverscrolled.set(!entries[entries.length - 1].isIntersecting),
                    { root }
                );

                this.setPageOverscroll = newPageEl => {
                    overscrollObserver.unobserve(pageOverscrollTriggerEl);
                    unsubscribe();

                    if (newPageEl) {
                        newPageEl.prepend(pageOverscrollTriggerEl);
                        overscrollObserver.observe(pageOverscrollTriggerEl);
                        unsubscribe = this.pageOverscrolled.subscribeSync(overscrolled => {
                            newPageEl.classList.toggle('page_overscrolled', overscrolled);
                        });
                    }
                };
            }
        }
    }

    define(name: string, render: RawViewConfig | Page['render'], options?: PageOptions) {
        return PageRenderer.define(this, name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this.#view)
                : (el, data, context) => this.#view.render(el, render, data, context),
            options: Object.freeze({ ...options }),
            [CONFIG]: render
        } satisfies Page));
    }

    render(prevPageEl: HTMLElement, name: string, data: any, context: any) {
        const renderStartTime = Date.now();
        let page = this.get(name);
        let rendered: ReturnType<Page['render']>;

        if (!page) {
            page = this.get('not-found') || BUILDIN_NOT_FOUND;
            data = { name };
        }

        const { reuseEl, init, keepScrollOffset = true } = page.options || {};
        const pageChanged = this.lastPage !== name;
        const pageRef = context && context.id;
        const pageRefChanged = this.lastPageRef !== pageRef;
        const newPageEl = reuseEl && !pageChanged ? prevPageEl : document.createElement('article');
        const parentEl = prevPageEl.parentNode;

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
            rendered = this.#view.render(newPageEl, 'alert-danger', String(e) + ' (see details in console)');
            this.#host.log('error', 'Page render error:', e);
        }

        if (parentEl !== null && (pageChanged || pageRefChanged || !keepScrollOffset)) {
            (parentEl as HTMLElement).scrollTop = 0;
        }

        if (newPageEl !== prevPageEl) {
            prevPageEl.replaceWith(newPageEl);
            this.setPageOverscroll(newPageEl);
        }

        return {
            pageEl: newPageEl,
            config: page[CONFIG],
            renderState: Promise.resolve(rendered)
                .finally(() => this.#host.log(
                    'perf',
                    `Page "${page.name}" rendered in ${(Date.now() - renderStartTime)}ms`
                ))
        };
    }
}
