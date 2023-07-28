/* eslint-env browser */

import Dict from './dict.js';
import Publisher from './publisher.js';
import { createElement } from '../core/utils/dom.js';

const CONFIG = Symbol('config');
const BUILDIN_NOT_FOUND = {
    name: 'not-found',
    render: (el, { name }) => {
        el.style.cssText = 'color:#a00';
        el.innerText = `Page \`${name}\` not found`;
    }
};

export default class PageRenderer extends Dict {
    constructor(host) {
        super();

        this.host = host;
        this.lastPage = null;
        this.lastPageId = null;

        this.pageOverscrolled = new Publisher(false);
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

                this.setPageOverscroll = newPageEl => {
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

    define(name, render, options) {
        super.define(name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this.host.view)
                : (el, data, context) => this.host.view.render(el, render, data, context),
            options: Object.freeze({ ...options }),
            [CONFIG]: render
        }));
    }

    render(prevPageEl, name, data, context) {
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
        const pageRefChanged = this.lastPageId !== pageRef;
        const newPageEl = reuseEl && !pageChanged ? prevPageEl : document.createElement('article');
        const parentEl = prevPageEl.parentNode;

        this.lastPage = name;
        this.lastPageId = pageRef;
        newPageEl.id = prevPageEl.id;
        newPageEl.classList.add('page', 'page-' + name);

        if (pageChanged && typeof init === 'function') {
            init(newPageEl);
        }

        try {
            rendered = page.render(newPageEl, data, context);
        } catch (e) {
            // FIXME: Should not to use a view (alert-danger) since it may to be undefined. Replace render with onError hook?
            rendered = this.host.view.render(newPageEl, 'alert-danger', String(e) + ' (see details in console)');
            this.host.log('error', 'Page render error:', e);
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
            renderState: Promise.resolve(rendered)
                .finally(() => this.host.log(
                    'perf',
                    `Page "${page.name}" rendered in ${(Date.now() - renderStartTime)}ms`
                ))
        };
    }
}
