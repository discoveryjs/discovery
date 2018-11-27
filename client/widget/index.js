/* eslint-env browser */

import ViewRenderer from '../core/view.js';
import PageRenderer from '../core/page.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { createElement } from '../core/utils/dom.js';
import jora from '/gen/jora.js'; // FIXME: generated file to make it local

const hasOwnProperty = Object.prototype.hasOwnProperty;
const lastSetDataPromise = new WeakMap();
const renderPageScheduler = new WeakMap();

function apply(fn, host) {
    if (typeof fn === 'function') {
        fn.call(window, host);
    }
}

function equal(a, b) {
    if (a === b) {
        return true;
    }

    for (let key in a) {
        if (hasOwnProperty.call(a, key)) {
            if (!hasOwnProperty.call(b, key) || a[key] !== b[key]) {
                return false;
            }
        }
    }

    for (let key in b) {
        if (hasOwnProperty.call(b, key)) {
            if (!hasOwnProperty.call(a, key) || a[key] !== b[key]) {
                return false;
            }
        }
    }

    return true;
}

export default class Widget {
    constructor(container, options) {
        this.options = options || {};
        this.dev = Boolean(this.options.dev);
        this.view = new ViewRenderer(this);
        this.page = new PageRenderer(this.view);
        this.badges = [];
        this.prepare = data => data;

        this.pageId = 'default';
        this.pageRef = null;
        this.pageParams = {};
        this.scheduledRenderPage = null;

        this.dom = {};
        this.queryExtensions = {
            query: (...args) => this.query(...args)
        };

        this.apply(views);
        this.apply(pages);
        this.setContainer(container);
    }

    apply(extensions) {
        if (Array.isArray(extensions)) {
            extensions.forEach(extension => apply(extension, this));
        } else if (typeof extensions === 'function') {
            apply(extensions, this);
        } else if (extensions) {
            this.apply(Object.values(extensions));
        } else {
            console.error('Bad type of extension:', extensions);
        }
    }

    //
    // Data
    //

    setPrepare(fn) {
        if (typeof fn !== 'function') {
            throw new Error('An argument should be a function');
        }

        this.prepare = fn;
    }

    setData(data, context = {}) {
        const setDataPromise = Promise
            .resolve(this.prepare(data, value => data = value))
            .then(() => {
                const currentPromise = lastSetDataPromise.get(this);

                // prevent race conditions
                if (currentPromise !== setDataPromise) {
                    // chain by current promise
                    return currentPromise;
                }

                this.data = data;
                this.context = context;

                this.renderSidebar();
                this.renderPage();
            });

        lastSetDataPromise.set(this, setDataPromise);

        return setDataPromise;
    }

    //
    // Data query
    //

    query(query, data, context) {
        switch (typeof query) {
            case 'function':
                return query(data, context);

            case 'string':
                return jora(query, this.queryExtensions)(data, context);

            default:
                return query;
        }
    }

    queryBool(...args) {
        try {
            return jora.buildin.bool(this.query(...args));
        } catch (e) {
            return false;
        }
    }

    addQueryHelpers(extensions) {
        Object.assign(this.queryExtensions, extensions);
    }

    //
    // UI
    //

    setContainer(container) {
        const containerEl = container || null;

        if (containerEl) {
            this.dom.container = containerEl;

            containerEl.classList.add('discovery');

            containerEl.appendChild(
                this.dom.sidebar = createElement('nav', 'discovery-sidebar')
            );

            containerEl.appendChild(
                createElement('main', 'discovery-content', [
                    this.dom.badges = createElement('div', 'discovery-content-badges'),
                    this.dom.pageContent = createElement('article')
                ])
            );

            this.badges.forEach(badge =>
                this.dom.badges.appendChild(badge.el)
            );
        } else {
            for (let key in this.dom) {
                this.dom[key] = null;
            }
        }
    }

    addBadge(caption, action, visible) {
        const badge = {
            el: document.createElement('div'),
            visible: typeof visible === 'function' ? visible : () => true
        };

        badge.el.className = 'badge';
        badge.el.addEventListener('click', action);
        badge.el.hidden = !badge.visible(this);

        if (typeof caption === 'function') {
            caption(badge.el);
        } else {
            badge.el.innerHTML = caption;
        }

        if (this.dom.badges) {
            this.dom.badges.appendChild(badge.el);
        }

        this.badges.push(badge);

        return badge;
    }

    getSidebarContext() {
        return this.context;
    }

    renderSidebar() {
        if (this.view.isDefined('sidebar')) {
            const t = Date.now();

            this.view.render(
                this.dom.sidebar,
                'sidebar',
                this.data,
                this.getSidebarContext()
            ).then(() => console.log('[Discovery] renderSidebar', Date.now() - t));
        }
    }

    getPageContext() {
        return {
            page: this.pageId,
            id: this.pageRef,
            params: this.pageParams,
            dev: this.dev,
            ...this.context
        };
    }

    getPageOption(name, fallback) {
        const page = this.page.pages[this.pageId];

        return page && name in page.options ? page.options[name] : fallback;
    }

    setPage(id, ref, params) {
        this.pageId = id || 'default';
        this.pageRef = ref;
        this.setPageParams(params);
        this.scheduleRenderPage();
    }

    setPageParams(params) {
        if (!equal(params, this.pageParams)) {
            this.pageParams = params || {};
            this.scheduleRenderPage();
            return true;
        }
    }

    definePage(...args) {
        this.page.define(...args);
    }

    scheduleRenderPage() {
        if (!renderPageScheduler.has(this)) {
            renderPageScheduler.set(this, setTimeout(() => this.renderPage(), 0));
        }
    }

    renderPage() {
        // cancel renderPage schedule
        if (renderPageScheduler.has(this)) {
            clearTimeout(renderPageScheduler.get(this));
            renderPageScheduler.delete(this);
        }

        this.dom.pageContent = this.page.render(
            this.dom.pageContent,
            this.pageId,
            this.data,
            this.getPageContext()
        );

        this.badges.forEach(badge => badge.el.hidden = !badge.visible(this));

        if (this.pageParams.dzen) {
            this.dom.container.dataset.dzen = true;
        } else {
            delete this.dom.container.dataset.dzen;
        }
    }
}
