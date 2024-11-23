/* eslint-env browser */

import type { ViewModel, PageParams } from '../main/index.js';
import type { ViewRenderer } from './view.js';
import { Dictionary } from './dict.js';
import { Observer } from './observer.js';
import { createElement } from './utils/dom.js';
import { isRawViewConfig, type RawViewConfig } from './view.js';

export type PageOptionName = keyof PageOptions;
export type PageOptionRender = RawViewConfig | Page['render'];
export type PageOptions = {
    reuseEl: boolean;
    init(newPageEl: HTMLElement): void;
    render: PageOptionRender;
    keepScrollOffset: boolean;
    encodeParams(params: PageParams): [string, any][] | string;
    decodeParams(params: [string, string | boolean][]): Record<string, unknown>;
};
export type PageOptionsWithoutRender = Exclude<PageOptions, 'render'>;
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

export class PageRenderer extends Dictionary<Page> {
    #host: ViewModel;
    #view: ViewRenderer;
    #lastRenderPageEl: HTMLElement | null;
    lastPage: string | null;
    lastPageRef: string | number | null;
    pageOverscrolled: Observer<boolean>;
    setPageOverscroll: (el: HTMLElement) => void;

    constructor(host: ViewModel, view: ViewRenderer) {
        super();

        this.#host = host;
        this.#view = view;
        this.#lastRenderPageEl = null;
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

    define(name: string, options: PageOptions): Readonly<Page>;
    define(name: string, render: PageOptionRender, options?: PageOptionsWithoutRender): Readonly<Page>;
    define(name: string, _render: PageOptionRender | PageOptions, _options?: PageOptionsWithoutRender): Readonly<Page> {
        const options: Partial<PageOptions> = isRawViewConfig(_render) || typeof _render === 'function'
            ? { ..._options, render: _render }
            : _render;
        const { render, ...optionsWithoutRender } = options;

        if (render === undefined) {
            throw new Error(`Page "${name}" requires a specified render option`);
        }

        return PageRenderer.define(this, name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this.#view)
                : (el, data, context) => this.#view.render(el, render, data, context),
            options: Object.freeze(optionsWithoutRender),
            [CONFIG]: render
        } satisfies Page));
    }

    render(prevPageEl: HTMLElement, name: string, data: any, context: any) {
        let page = this.get(name);

        if (!page) {
            page = this.get('not-found') || BUILDIN_NOT_FOUND;
            data = { name };
        }

        const { reuseEl, init, keepScrollOffset = true } = page.options || {};
        const pageRef = this.#host.pageRef;
        const pageChanged = this.lastPage !== name;
        const pageRefChanged = this.lastPageRef !== pageRef;
        const newPageEl = reuseEl && !pageChanged
            ? prevPageEl
            : createElement('article', `page page-${CSS.escape(name)}`);

        this.#lastRenderPageEl = newPageEl;
        this.lastPage = name;
        this.lastPageRef = pageRef;

        if (pageChanged && typeof init === 'function') {
            init(newPageEl);
        }

        const renderState = new Promise<void>(async (resolve, reject) => {
            try {
                await page.render(newPageEl, data, context);

                if (this.#lastRenderPageEl !== newPageEl) {
                    reject(new Error('Aborted by new page render'));
                    return;
                }

                if (newPageEl !== prevPageEl) {
                    prevPageEl.replaceWith(newPageEl);
                    this.setPageOverscroll(newPageEl);
                }

                const parentEl = newPageEl.parentNode;

                if (parentEl !== null && (pageChanged || pageRefChanged || !keepScrollOffset)) {
                    (parentEl as HTMLElement).scrollTop = 0;
                }

                resolve();
            } catch (e) {
                newPageEl.replaceChildren();
                // FIXME: Should not to use a view (alert-danger) since it may to be undefined. Replace render with onError hook?
                this.#view.render(newPageEl, 'alert-danger', String(e) + ' (see details in console)');
                reject(e);
            }
        });

        return {
            pageEl: newPageEl,
            config: page[CONFIG],
            renderState
        };
    }
}
