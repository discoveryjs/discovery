/* eslint-env browser */

const BUILDIN_NOT_FOUND = {
    name: 'not-found',
    render: (el, { name }) => {
        el.style.cssText = 'color:#a00';
        el.innerText = `Page \`${name}\` not found`;
    }
};

export default class PageRenderer {
    constructor(view) {
        this.view = view;
        this.pages = Object.create(null);
        this.lastPage = null;
    }

    define(name, render, options) {
        this.pages[name] = {
            name,
            render: typeof render === 'function'
                ? render
                : (el, data, context) => this.view.render(el, render, data, context),
            options: options || {}
        };
    }

    render(oldPageEl, name, data, context) {
        const startTime = Date.now();
        let page = this.pages[name];
        let rendered;

        if (!page) {
            page = this.pages['not-found'] || BUILDIN_NOT_FOUND;
            data = { name };
        }

        const { reuseEl, init, keepScrollOffset } = page.options || {};
        const pageChanged = this.lastPage !== name;
        const newPageEl = reuseEl && !pageChanged ? oldPageEl : document.createElement('article');
        const parentEl = oldPageEl.parentNode;

        this.lastPage = name;
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

        if (pageChanged || !keepScrollOffset) {
            parentEl.scrollTop = 0;
        }

        Promise.resolve(rendered).then(() =>
            console.log('Page `' + page.name + '` rendered in ' + (Date.now() - startTime) + 'ms')
        );

        return newPageEl;
    }
}
