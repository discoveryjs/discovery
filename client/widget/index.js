/* eslint-env browser */

import ViewRenderer from '../core/view.js';
import PageRenderer from '../core/page.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { createElement } from '../core/utils/dom.js';
import jora from '/gen/jora.js'; // FIXME: generated file to make it local

const lastSetDataPromise = new WeakMap();
const renderScheduler = new WeakMap();

function defaultEncodeParams(params) {
    return new URLSearchParams(params).toString();
}

function defaultDecodeParams(value) {
    return value;
}

function getPageMethod(instance, pageId, name, fallback) {
    const page = instance.page.get(pageId);

    return page && typeof page.options[name] === 'function'
        ? page.options[name]
        : fallback;
}

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

function fuzzyStringCmp(a, b) {
    const startChar = a[0];
    const lastChar = a[a.length - 1];
    const start = startChar === '"' || startChar === "'" ? 1 : 0;
    const end = lastChar === '"' || lastChar === "'" ? 1 : 0;

    return b.toLowerCase().indexOf(a.toLowerCase().substring(start, a.length - end), b[0] === '"' || b[0] === "'") !== -1;
}

export default class Widget {
    constructor(container, options) {
        this.options = options || {};
        this.view = new ViewRenderer(this);
        this.page = new PageRenderer(this.view);
        this.entityResolvers = [];
        this.linkResolvers = [];
        this.badges = [];
        this.prepare = data => data;

        this.defaultPageId = this.options.defaultPageId || 'default';
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams);
        this.scheduledRenderPage = null;

        this.dom = {};
        this.queryExtensions = {
            query: (...args) => this.query(...args),
            pageLink: (pageRef, pageId, pageParams) =>
                this.encodePageHash(pageId, pageRef, pageParams)
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
            .then(() => {  // TODO: use prepare ret
                const lastPromise = lastSetDataPromise.get(this);

                // prevent race conditions, perform only this promise was last one
                if (lastPromise !== setDataPromise) {
                    throw new Error('Prevented by another setData()');
                }

                this.data = data;
                this.context = context;
            });

        // mark as last setData promise
        lastSetDataPromise.set(this, setDataPromise);

        // run after data is prepared and set
        setDataPromise.then(() => {
            this.scheduleRender('sidebar');
            this.scheduleRender('page');
        });

        return setDataPromise;
    }

    addEntityResolver(fn) {
        this.entityResolvers.push(fn);
    }

    resolveEntity(value) {
        for (let i = 0; i < this.entityResolvers.length; i++) {
            const entity = this.entityResolvers[i](value);

            if (entity) {
                return entity;
            }
        }
    }

    addValueLinkResolver(fn) {
        this.linkResolvers.push(fn);
    }

    resolveValueLinks(value) {
        const result = [];
        const type = typeof value;

        if (value && (type === 'object' || type === 'string')) {
            const entity = this.resolveEntity(value);

            for (let i = 0; i < this.linkResolvers.length; i++) {
                const link = this.linkResolvers[i](entity, value, this.data, this.context);

                if (link) {
                    result.push(link);
                }
            }
        }

        return result.length ? result : null;
    }

    //
    // Data query
    //

    query(query, data, context) {
        switch (typeof query) {
            case 'function':
                return query(data, context);

            case 'string':
                return jora(query, { methods: this.queryExtensions })(data, context);

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

    querySuggestions(query, offset, data, context) {
        const typeOrder = ['property', 'value', 'method'];
        let suggestions;

        try {
            suggestions = jora(query, {
                methods: this.queryExtensions,
                tolerant: true,
                stat: true
            })(data, context).suggestion(offset);

            // console.log({ query, offset, suggestions, data, context });
            if (suggestions) {
                return suggestions
                    .filter(
                        item => item.value !== item.current && fuzzyStringCmp(item.current, item.value)
                    )
                    .sort((a, b) => {
                        const at = typeOrder.indexOf(a.type);
                        const bt = typeOrder.indexOf(b.type);
                        return at - bt || (a.value < b.value ? -1 : 1);
                    });
            }
        } catch (e) {
            console.error(e);
            return;
        }
    }

    getQueryEngineInfo() {
        return {
            name: 'jora',
            version: jora.version,
            link: 'https://github.com/lahmatiy/jora'
        };
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

    scheduleRender(subject) {
        if (!renderScheduler.has(this)) {
            const subjects = new Set();

            renderScheduler.set(this, subjects);
            Promise.resolve().then(() => {
                renderScheduler.delete(this);

                if (subjects.has('sidebar')) {
                    this.renderSidebar();
                }

                if (subjects.has('page')) {
                    this.renderPage();
                }
            });
        }

        renderScheduler.get(this).add(subject);
    }

    cancelScheduledRender(subject) {
        const sheduledRenders = renderScheduler.get(this);

        if (sheduledRenders) {
            if (subject) {
                sheduledRenders.delete(subject);
            } else {
                sheduledRenders.clear();
            }
        }
    }

    getSidebarContext() {
        return this.context;
    }

    renderSidebar() {
        // cancel scheduled renderSidebar
        if (renderScheduler.has(this)) {
            renderScheduler.get(this).delete('sidebar');
        }

        if (this.view.isDefined('sidebar')) {
            const renderStartTime = Date.now();

            this.dom.sidebar.innerHTML = '';
            this.view.render(
                this.dom.sidebar,
                'sidebar',
                this.data,
                this.getSidebarContext()
            ).then(() => console.log(`[Discovery] Sidebar rendered in ${Date.now() - renderStartTime}ms`));
        }
    }

    definePage(pageId, render, options) {
        this.page.define(pageId, render, options);

        if (options && options.resolveLink) {
            switch (typeof options.resolveLink) {
                case 'string':
                    const [type, ref = 'id'] = options.resolveLink.split(':');

                    this.addValueLinkResolver((entity) => {
                        if (entity && entity.type === type) {
                            return {
                                type: entity.type,
                                text: entity.name,
                                href: this.encodePageHash(pageId, entity[ref])
                            };
                        }
                    });
                    break;

                case 'function':
                    this.addValueLinkResolver((entity, value, data, context) => {
                        if (!value) {
                            return;
                        }

                        const link = options.resolveLink(entity, value, data, context);

                        if (link) {
                            return {
                                type: pageId,
                                text: typeof link === 'string' ? link : pageId,
                                href: this.encodePageHash(pageId, link)
                            };
                        }
                    });
                    break;

                default:
                    console.warn(`[Discovery] Page '${pageId}' has a bad value for resolveLink:`, options.resolveLink);
            }
        }
    }

    encodePageHash(pageId, pageRef, pageParams) {
        const encodeParams = getPageMethod(this, pageId, 'encodeParams', defaultEncodeParams);
        const encodedParams = encodeParams(pageParams || {});

        return `#${
            pageId !== this.defaultPageId ? pageId : ''}${
            pageRef && typeof pageRef === 'string' ? ':' + pageRef : ''}${
            encodedParams ? '&' + encodedParams : ''
        }`;
    }

    decodePageHash(hash) {
        const parts = hash.substr(1).split('&');
        const [pageId, pageRef] = (parts.shift() || '').split(':');
        const decodeParams = getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams);
        const pageParams = decodeParams([...new URLSearchParams(parts.join('&'))].reduce((map, [key, value]) => {
            map[key] = value || true;
            return map;
        }, {}));

        return {
            pageId: pageId || this.defaultPageId,
            pageRef,
            pageParams
        };
    }

    getPageContext() {
        return {
            page: this.pageId,
            id: this.pageRef,
            params: this.pageParams,
            ...this.context
        };
    }

    getPageOption(name, fallback) {
        const page = this.page.get(this.pageId);

        return page && name in page.options ? page.options[name] : fallback;
    }

    setPage(pageId, pageRef, pageParams, replace) {
        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams),
            replace
        );
    }

    setPageParams(pageParams, replace) {
        return this.setPageHash(
            this.encodePageHash(this.pageId, this.pageRef, pageParams),
            replace
        );
    }

    setPageHash(hash) {
        if (hash !== this.pageHash) {
            const { pageId, pageRef, pageParams } = this.decodePageHash(hash);
            const changed =
                this.pageId !== pageId ||
                this.pageRef !== pageRef ||
                !equal(this.pageParams, pageParams);

            this.pageHash = hash;

            if (changed) {
                this.pageId = pageId;
                this.pageRef = pageRef;
                this.pageParams = pageParams;
                this.scheduleRender('page');
            }

            return changed;
        }

        return false;
    }

    renderPage() {
        // cancel scheduled renderPage
        if (renderScheduler.has(this)) {
            renderScheduler.get(this).delete('page');
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
