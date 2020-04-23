/* eslint-env browser */

import Emitter from '../core/emitter.js';
import ViewRenderer from '../core/view.js';
import PresetRenderer from '../core/preset.js';
import PageRenderer from '../core/page.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { createElement } from '../core/utils/dom.js';
import attachViewInspector from './view-inspector.js';
import jora from '/gen/jora.js'; // FIXME: generated file to make it local

const lastSetDataPromise = new WeakMap();
const lastQuerySuggestionsStat = new WeakMap();
const renderScheduler = new WeakMap();

function defaultEncodeParams(params) {
    return new URLSearchParams(params).toString();
}

function defaultDecodeParams(value) {
    return value;
}

function setDatasetValue(el, key, value) {
    if (value) {
        el.dataset[key] = true;
    } else {
        delete el.dataset[key];
    }
}

function getPageMethod(instance, pageId, name, fallback) {
    const page = instance.page.get(pageId);

    return page && typeof page.options[name] === 'function'
        ? page.options[name]
        : fallback;
}

function extractValueLinkResolver(host, pageId) {
    const { resolveLink } = host.page.get(pageId).options;

    if (!resolveLink) {
        return;
    }

    switch (typeof resolveLink) {
        case 'string':
            const [type, ref = 'id'] = resolveLink.split(':');

            return (entity) => {
                if (entity && entity.type === type) {
                    return {
                        type: pageId,
                        text: entity.name,
                        href: host.encodePageHash(pageId, entity[ref]),
                        entity: entity.entity
                    };
                }
            };

        case 'function':
            return (entity, value, data, context) => {
                if (!value) {
                    return;
                }

                const link = resolveLink(entity, value, data, context);

                if (link) {
                    return {
                        type: pageId,
                        text: typeof link === 'string' ? link : pageId,
                        href: host.encodePageHash(pageId, link),
                        entity: entity.entity
                    };
                }
            };

        default:
            console.warn(`[Discovery] Page '${pageId}' has a bad value for resolveLink:`, resolveLink);
    }
}

function genUniqueId(len = 16) {
    const base36 = val => Math.round(val).toString(36);
    let uid = base36(10 + 25 * Math.random()); // uid should starts with alpha

    while (uid.length < len) {
        uid += base36(new Date * Math.random());
    }

    return uid.substr(0, len);
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

export default class Widget extends Emitter {
    constructor(container, defaultPage, options) {
        super();

        this.options = options || {};
        this.view = new ViewRenderer(this);
        this.preset = new PresetRenderer(this.view);
        this.page = new PageRenderer(this.view);
        this.page.on('define', name => this.addValueLinkResolver(extractValueLinkResolver(this, name)));
        this.entityResolvers = [];
        this.linkResolvers = [];
        this.prepare = data => data;

        this.defaultPageId = this.options.defaultPageId || 'default';
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams);
        this.scheduledRenderPage = null;

        this.instanceId = genUniqueId();
        this.isolateStyleMarker = this.options.isolateStyleMarker || 'style-boundary-8H37xEyN';
        this.badges = [];
        this.dom = {};
        this.queryExtensions = {
            query: (...args) => this.query(...args),
            pageLink: (pageRef, pageId, pageParams) =>
                this.encodePageHash(pageId, pageRef, pageParams)
        };

        this.apply(views);
        this.apply(pages);

        if (defaultPage) {
            this.page.define('default', defaultPage);
        }

        if (this.options.extensions) {
            this.apply(this.options.extensions);
        }

        this.setContainer(container);
    }

    apply(extensions) {
        if (Array.isArray(extensions)) {
            extensions.forEach(extension => this.apply(extension));
        } else if (typeof extensions === 'function') {
            extensions.call(window, this);
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
        const startTime = Date.now();
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

                this.emit('data');
                console.log(`[Discovery] Data prepared in ${Date.now() - startTime}ms`);
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

    addValueLinkResolver(resolver) {
        if (typeof resolver === 'function') {
            this.linkResolvers.push(resolver);
        }
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
            let stat = lastQuerySuggestionsStat.get(this);

            if (!stat || stat.query !== query || stat.data !== data || stat.context !== context) {
                const options = {
                    methods: this.queryExtensions,
                    tolerant: true,
                    stat: true
                };

                lastQuerySuggestionsStat.set(this, stat = Object.assign(
                    jora(query, options)(data, context),
                    { query, data, context }
                ));
            }

            suggestions = stat.suggestion(offset);

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
            link: 'https://github.com/discoveryjs/jora'
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

            containerEl.classList.add('discovery', this.isolateStyleMarker);
            containerEl.dataset.discoveryInstanceId = this.instanceId;

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

            attachViewInspector(this);
        } else {
            for (let key in this.dom) {
                this.dom[key] = null;
            }
        }
    }

    addGlobalEventListener(eventName, handler, options) {
        const instanceId = this.instanceId;
        const handlerWrapper = function(event) {
            const root = event.target !== document
                ? event.target.closest('[data-discovery-instance-id]')
                : null;

            if (root && root.dataset.discoveryInstanceId === instanceId) {
                handler.call(this, event);
            }
        };

        document.addEventListener(eventName, handlerWrapper, options);
        return () => document.removeEventListener(eventName, handlerWrapper, options);
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

    //
    // Render common
    //

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

    getRenderContext() {
        return {
            page: this.pageId,
            id: this.pageRef,
            params: this.pageParams,
            ...this.context
        };
    }

    //
    // Sidebar
    //

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
                this.getRenderContext()
            ).then(() => console.log(`[Discovery] Sidebar rendered in ${Date.now() - renderStartTime}ms`));
        }
    }

    //
    // Page
    //

    encodePageHash(pageId, pageRef, pageParams) {
        const encodeParams = getPageMethod(this, pageId, 'encodeParams', defaultEncodeParams);
        const encodedParams = encodeParams(pageParams || {});

        return `#${
            pageId !== this.defaultPageId ? escape(pageId) : ''
        }${
            (typeof pageRef === 'string' && pageRef) || (typeof pageRef === 'number') ? ':' + escape(pageRef) : ''
        }${
            encodedParams ? '&' + encodedParams : ''
        }`;
    }

    decodePageHash(hash) {
        const parts = hash.substr(1).split('&');
        const [pageId, pageRef] = (parts.shift() || '').split(':').map(unescape);
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

    getPageOption(name, fallback) {
        const page = this.page.get(this.pageId);

        return page && name in page.options ? page.options[name] : fallback;
    }

    setPage(pageId, pageRef, pageParams, replace = false) {
        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams),
            replace
        );
    }

    setPageParams(pageParams, replace = false) {
        return this.setPageHash(
            this.encodePageHash(this.pageId, this.pageRef, pageParams),
            replace
        );
    }

    setPageHash(hash, replace = false) {
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
                this.emit('pageHashChange', replace);
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

        const { pageEl, renderState } = this.page.render(
            this.dom.pageContent,
            this.pageId,
            this.data,
            this.getRenderContext()
        );

        this.dom.pageContent = pageEl;
        this.badges.forEach(badge => badge.el.hidden = !badge.visible(this));

        setDatasetValue(this.dom.container, 'dzen', this.pageParams.dzen);
        setDatasetValue(this.dom.container, 'compact', this.options.compact);

        return renderState;
    }
}
