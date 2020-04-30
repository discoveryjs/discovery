/* eslint-env browser */

import Dict from './dict.js';

import type { ViewRenderer } from './view.js';

const BUILDIN_NOT_FOUND = {
    name: 'not-found',
    render: (el, { name }) => {
        el.style.cssText = 'color:#a00';
        el.innerText = `Page \`${name}\` not found`;
    }
};

export default class PageRenderer extends Dict {
    view: ViewRenderer;
    lastPage: string
    lastPageId: string;

    constructor(view) {
        super();

        this.view = view;
        this.lastPage = null;
        this.lastPageId = null;
    }

    define(name, render, options?) {
        super.define(name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this.view)
                : (el, data, context) => this.view.render(el, render, data, context),
            options: Object.freeze({ ...options })
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
            rendered = this.view.render(newPageEl, 'alert-danger', String(e) + ' (see details in console)', {});
            console.error(e);
        }

        if (newPageEl !== prevPageEl) {
            parentEl.replaceChild(newPageEl, prevPageEl);
        }

        if (pageChanged || pageRefChanged || !keepScrollOffset) {
            parentEl.scrollTop = 0;
        }

        return {
            pageEl: newPageEl,
            renderState: Promise.resolve(rendered).then(() =>
                console.log('[Discovery] Page `' + page.name + '` rendered in ' + (Date.now() - renderStartTime) + 'ms')
            )
        };
    }
}
