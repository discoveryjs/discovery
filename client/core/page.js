/* eslint-env browser */

import Emitter from './emitter.js';

const pages = new WeakMap();
const BUILDIN_NOT_FOUND = {
    name: 'not-found',
    render: (el, { name }) => {
        el.style.cssText = 'color:#a00';
        el.innerText = `Page \`${name}\` not found`;
    }
};

export default class PageRenderer extends Emitter {
    constructor(view) {
        super();

        this.view = view;
        this.lastPage = null;
        pages.set(this, Object.create(null));
    }

    define(name, render, options) {
        pages.get(this)[name] = Object.freeze({
            name,
            render: typeof render === 'function'
                ? render
                : (el, data, context) => this.view.render(el, render, data, context),
            options: Object.freeze(Object.assign({}, options))
        });

        this.emit('define', name);
    }

    isDefined(name) {
        return name in pages.get(this);
    }

    get(name) {
        return pages.get(this)[name];
    }

    get names() {
        return Object.keys(pages.get(this)).sort();
    }

    render(oldPageEl, name, data, context) {
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
        const newPageEl = reuseEl && !pageChanged ? oldPageEl : document.createElement('article');
        const parentEl = oldPageEl.parentNode;

        this.lastPage = name;
        this.lastPageId = pageRef;
        newPageEl.id = oldPageEl.id;
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

        if (newPageEl !== oldPageEl) {
            parentEl.replaceChild(newPageEl, oldPageEl);
        }

        if (pageChanged || pageRefChanged || !keepScrollOffset) {
            parentEl.scrollTop = 0;
        }

        Promise.resolve(rendered).then(() =>
            console.log('[Discovery] Page `' + page.name + '` rendered in ' + (Date.now() - renderStartTime) + 'ms')
        );

        return newPageEl;
    }
}
