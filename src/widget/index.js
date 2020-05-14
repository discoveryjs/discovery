/* eslint-env browser */

import Emitter from '../core/emitter.js';
import ViewRenderer from '../core/view.js';
import PresetRenderer from '../core/preset.js';
import PageRenderer from '../core/page.js';
import TypeResolver from '../core/type-resolver.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { createElement } from '../core/utils/dom.js';
import * as lib from '../lib.js';
import jora from '/gen/jora.js'; // FIXME: generated file to make it local

const lastSetDataPromise = new WeakMap();
const lastQuerySuggestionsStat = new WeakMap();
const renderScheduler = new WeakMap();

function defaultEncodeParams(params) {
    return params;
}

function defaultDecodeParams(pairs) {
    return Object.fromEntries(pairs);
}

function setDatasetValue(el, key, value) {
    if (value) {
        el.dataset[key] = true;
    } else {
        delete el.dataset[key];
    }
}

function getPageOption(host, pageId, name, fallback) {
    const page = host.page.get(pageId);

    return page && Object.hasOwnProperty.call(page.options, name)
        ? page.options[name]
        : fallback;
}

function getPageMethod(host, pageId, name, fallback) {
    const method = getPageOption(host, pageId, name, fallback);

    return typeof method === 'function'
        ? method
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

function createDataExtensionApi(instance) {
    const entityResolvers = new TypeResolver();
    // const linkResolvers = new X(instance.pageLinkResolvers, entityResolvers);
    const linkResolvers = [];
    const annotations = [];
    const queryExtensions = {
        query: (...args) => instance.query(...args),
        pageLink: (pageRef, pageId, pageParams) =>
            instance.encodePageHash(pageId, pageRef, pageParams),
        autolink(current, type) {
            if (current && typeof current.autolink === 'function') {
                return current.autolink();
            }

            const descriptor = entityResolvers.resolve(current, type);

            if (descriptor && typeof descriptor.link === 'function') {
                return descriptor.link(current);
            }
        }
    };
    const addValueAnnotation = (query, options = false) => {
        if (typeof options === 'boolean') {
            options = {
                debug: options
            };
        }

        annotations.push({
            query,
            ...options
        });
    };

    return {
        apply() {
            Object.assign(instance, {
                entityResolvers,
                linkResolvers,
                annotations,
                queryExtensions
            });
        },
        methods: {
            defineType(name, options) {
                const resolver = entityResolvers.define(name, options);
                const pageId = options && options.page;

                if (pageId) {
                    if (!instance.page.isDefined(options.page)) {
                        console.error(`[Discovery] Page reference "${options.page}" doesn't exist`);
                        return;
                    }

                    linkResolvers.push(value => {
                        const entity = resolver(value);

                        if (entity) {
                            return {
                                type: pageId,
                                text: entity.name,
                                href: instance.encodePageHash(pageId, entity.id),
                                entity: entity.entity
                            };
                        }
                    });

                    addValueAnnotation((value, context) => {
                        const entity = resolver(value);

                        if (entity && entity.value !== context.host) {
                            return {
                                place: 'before',
                                className: 'value-marker',
                                text: pageId,
                                href: instance.encodePageHash(pageId, entity.id)
                            };
                        }
                    });
                } else {
                    addValueAnnotation((value, context) => {
                        const entity = resolver(value);

                        if (entity && entity.value !== context.host) {
                            return {
                                place: 'before',
                                className: 'value-marker',
                                text: name
                            };
                        }
                    });
                }

                return resolver;
            },
            addValueAnnotation,
            addQueryHelpers(helpers) {
                Object.assign(queryExtensions, helpers);
            }
        }
    };
}

export default class Widget extends Emitter {
    constructor(container, defaultPage, options) {
        super();

        this.lib = lib; // FIXME: temporary solution to expose discovery's lib API

        this.options = options || {};
        this.view = new ViewRenderer(this);
        this.preset = new PresetRenderer(this.view);
        this.page = new PageRenderer(this.view);
        this.page.on('define', name => {
            this.addValueLinkResolver(extractValueLinkResolver(this, name));

            // FIXME: temporary solution to avoid missed custom page's `decodeParams` method call on initial render
            if (this.pageId === name && this.pageHash !== '#') {
                const hash = this.pageHash;
                this.pageHash = '#';
                this.setPageHash(hash);
                this.cancelScheduledRender();
            }
        });

        this.prepare = data => data;
        this.entityResolvers = [];
        this.linkResolvers = [];
        this.annotations = [];
        this.queryExtensions = {
            query: (...args) => this.query(...args),
            pageLink: (pageRef, pageId, pageParams) =>
                this.encodePageHash(pageId, pageRef, pageParams)
        };

        this.defaultPageId = this.options.defaultPageId || 'default';
        this.reportPageId = this.options.reportPageId || 'report';
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams);

        this.instanceId = genUniqueId();
        this.isolateStyleMarker = this.options.isolateStyleMarker || 'style-boundary-8H37xEyN';
        this.badges = [];
        this.dom = {};

        this.apply(views);
        this.apply(pages);

        if (defaultPage) {
            this.page.define(this.defaultPageId, defaultPage);
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
        const dataExtension = createDataExtensionApi(this);
        this._extensitionApi = dataExtension.methods; // TODO: remove
        const checkIsNotPrevented = () => {
            const lastPromise = lastSetDataPromise.get(this);

            // prevent race conditions, perform only if this promise is last one
            if (lastPromise !== setDataPromise) {
                throw new Error('Prevented by another setData()');
            }
        };
        const setDataPromise = Promise.resolve(data)
            .then((data) => {
                checkIsNotPrevented();

                return this.prepare(data, dataExtension.methods) || data;
            })
            .then((data) => {
                checkIsNotPrevented();

                this.data = data;
                this.context = context;
                dataExtension.apply(this);

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

    // TODO: remove
    addEntityResolver() {
        console.error('[Discovery] Widget#addEntityResolver() is removed, use extenstion API in prepare instead, i.e. setPrepare((data, { defineType }) => ...)');
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
            for (const resolver of this.linkResolvers) {
                const link = resolver(value);

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

                lastQuerySuggestionsStat.set(this, stat = { query, data, context, suggestion() {} });
                Object.assign(stat, jora(query, options)(data, context));
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
            console.groupCollapsed('[Discovery] Error on getting suggestions for query');
            console.error(e);
            console.groupEnd();
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

    // TODO: remove
    addQueryHelpers(extensions) {
        console.warn('[Discovery] Widget#addQueryHelpers() is deprecated, use extenstion API in prepare instead');
        this._extensitionApi.addQueryHelpers(extensions);
    }

    //
    // UI
    //

    setContainer(container) {
        const newContainerEl = container || null;
        const oldDomRefs = this.dom;

        if (this.dom.container === newContainerEl) {
            return;
        }

        // reset old refs
        this.dom = {};

        if (newContainerEl !== null) {
            this.dom.container = newContainerEl;

            newContainerEl.classList.add('discovery', this.isolateStyleMarker);
            newContainerEl.dataset.discoveryInstanceId = this.instanceId;

            newContainerEl.appendChild(
                this.dom.sidebar = createElement('nav', 'discovery-sidebar')
            );

            newContainerEl.appendChild(
                createElement('main', 'discovery-content', [
                    this.dom.badges = createElement('div', 'discovery-content-badges'),
                    this.dom.pageContent = createElement('article')
                ])
            );

            this.badges.forEach(badge =>
                this.dom.badges.appendChild(badge.el)
            );
        }

        this.emit('container-changed', this.dom, oldDomRefs);
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
        const scheduledRenders = renderScheduler.get(this);

        if (scheduledRenders) {
            if (subject) {
                scheduledRenders.delete(subject);
            } else {
                scheduledRenders.clear();
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
        let encodedParams = encodeParams(pageParams || {});

        if (encodedParams && typeof encodedParams !== 'string') {
            if (!Array.isArray(encodedParams)) {
                encodedParams = Object.entries(encodedParams);
            }

            encodedParams = encodedParams
                .map(pair => pair.map(encodeURIComponent).join('='))
                .join('&');
        }

        return `#${
            pageId !== this.defaultPageId ? encodeURIComponent(pageId) : ''
        }${
            (typeof pageRef === 'string' && pageRef) || (typeof pageRef === 'number') ? ':' + encodeURIComponent(pageRef) : ''
        }${
            encodedParams ? '&' + encodedParams : ''
        }`;
    }

    decodePageHash(hash) {
        const delimIndex = (hash.indexOf('&') + 1 || hash.length + 1) - 1;
        const [pageId, pageRef] = hash.substring(1, delimIndex).split(':').map(decodeURIComponent);
        const decodeParams = getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams);
        const pairs = hash.substr(delimIndex + 1).split('&').map(pair => {
            const eqIndex = pair.indexOf('=');
            return eqIndex !== -1
                ? [decodeURIComponent(pair.slice(0, eqIndex)), decodeURIComponent(pair.slice(eqIndex + 1))]
                : [decodeURIComponent(pair), true];
        });

        return {
            pageId: pageId || this.defaultPageId,
            pageRef,
            pageParams: decodeParams(pairs)
        };
    }

    setPage(pageId, pageRef, pageParams, replace = false) {
        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams),
            replace
        );
    }

    setPageParams(pageParams, replace = false) {
        return this.setPage(this.pageId, this.pageRef, pageParams, replace);
    }

    setPageHash(hash, replace = false) {
        const { pageId, pageRef, pageParams } = this.decodePageHash(hash);

        if (this.pageId !== pageId ||
            this.pageRef !== pageRef ||
            !equal(this.pageParams, pageParams)) {

            this.pageId = pageId;
            this.pageRef = pageRef;
            this.pageParams = pageParams;
            this.scheduleRender('page');

            if (hash !== this.pageHash) {
                this.pageHash = hash;
                this.emit('pageHashChange', replace);

                return true;
            }
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
