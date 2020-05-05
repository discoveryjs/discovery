/* eslint-env browser */

import Emitter from '../core/emitter.js';
import ViewRenderer, { viewConfig } from '../core/view.js';
import PresetRenderer from '../core/preset.js';
import PageRenderer from '../core/page.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { createElement } from '../core/utils/dom.js';
// @ts-ignore
import jora from '/gen/jora.js'; // FIXME: generated file to make it local
import { genUniqueId, equal, fuzzyStringCmp } from './utils.js';

const lastSetDataPromise = new WeakMap();
const lastQuerySuggestionsStat = new WeakMap();
const renderScheduler = new WeakMap();

function defaultEncodeParams(params) {
    return new URLSearchParams(params).toString();
}

function defaultDecodeParams(value: string) {
    return value;
}

function setDatasetValue(el: HTMLElement, key: string, value: any) {
    if (value) {
        el.dataset[key] = 'true';
    } else {
        delete el.dataset[key];
    }
}

function getPageMethod(host: Widget, pageId: string, name: string, fallback: (...args: any[]) => any) {
    const page = host.page.get(pageId);

    return page && typeof page.options[name] === 'function'
        ? page.options[name]
        : fallback;
}

function extractValueLinkResolver(host: Widget, pageId: string): LinkResolver {
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

type extensionFn = (host: Widget) => void;
type extension = extension[] | extensionFn | { [key: string]: extension };
type EntityResolver = (value: any) => Entity;
type LinkResolver =
    ((entity: Entity) => EntityLink) |
    ((entity: Entity, value: any, data?: any, context?: any) => EntityLink);
interface Entity {
    type: string;
    id: any;
    name: any;
    entity: any;
}
interface EntityLink {
    type: string;
    text: string;
    href: string;
    entity: any;
}
export interface WidgetOptions {
    defaultPageId?: string;
    isolateStyleMarker?: string;
    compact?: boolean;
    extensions?: extension;
}
interface Badge {
    el: HTMLElement;
    visible: (host: Widget) => boolean;
};

export default class Widget extends Emitter {
    options: WidgetOptions;
    view: ViewRenderer;
    preset: PresetRenderer;
    page: PageRenderer;
    entityResolvers: EntityResolver[];
    linkResolvers: LinkResolver[];
    prepare: (data: any, cb: any) => any;
    defaultPageId: string;
    pageId: string;
    pageRef: string | null;
    pageParams: Record<string, any>;
    pageHash: string;
    instanceId: string;
    isolateStyleMarker: string;
    badges: Badge[];
    dom: Record<string, HTMLElement>;
    queryExtensions: Record<string, Function>;
    data: any;
    context: any;

    constructor(container: HTMLElement, defaultPage?: viewConfig, options?: WidgetOptions) {
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

        this.instanceId = genUniqueId();
        this.isolateStyleMarker = this.options.isolateStyleMarker || 'style-boundary-8H37xEyN';
        this.badges = [];
        this.dom = {};
        this.queryExtensions = {
            query: (query, data, context) => this.query(query, data, context),
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

    apply(extension: extension) {
        if (Array.isArray(extension)) {
            extension.forEach(item => this.apply(item));
        } else if (typeof extension === 'function') {
            extension.call(window, this);
        } else if (extension) {
            this.apply(Object.values(extension));
        } else {
            console.error('Bad type of extension:', extension);
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

    setData(data: any, context: any = {}) {
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

    addEntityResolver(fn: EntityResolver) {
        this.entityResolvers.push(fn);
    }

    resolveEntity(value: any) {
        for (let i = 0; i < this.entityResolvers.length; i++) {
            const entity = this.entityResolvers[i](value);

            if (entity) {
                return entity;
            }
        }
    }

    addValueLinkResolver(resolver: LinkResolver) {
        if (typeof resolver === 'function') {
            this.linkResolvers.push(resolver);
        }
    }

    resolveValueLinks(value: any): EntityLink[] | null {
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

    queryBool(query, data, context) {
        try {
            return jora.buildin.bool(this.query(query, data, context));
        } catch (e) {
            return false;
        }
    }

    querySuggestions(query, offset: number, data, context) {
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
        }
    }

    getQueryEngineInfo() {
        return {
            name: 'jora',
            version: jora.version,
            link: 'https://github.com/discoveryjs/jora'
        };
    }

    addQueryHelpers(extensions: { [key: string]: Function }) {
        Object.assign(this.queryExtensions, extensions);
    }

    //
    // UI
    //

    setContainer(container: HTMLElement | null) {
        const containerEl = container || null;

        if (containerEl) {
            this.dom.container = containerEl;
            this.dom.badges = createElement('div', 'discovery-content-badges'),
            this.dom.pageContent = createElement('article')
            this.dom.sidebar = createElement('nav', 'discovery-sidebar');

            containerEl.classList.add('discovery', this.isolateStyleMarker);
            containerEl.dataset.discoveryInstanceId = this.instanceId;

            containerEl.appendChild(this.dom.sidebar);
            containerEl.appendChild(
                createElement('main', 'discovery-content', [
                    this.dom.badges,
                    this.dom.pageContent
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

    addGlobalEventListener(
        eventName: keyof HTMLElementEventMap,
        handler: (event: Event) => void,
        options?: AddEventListenerOptions
    ) {
        const instanceId = this.instanceId;
        const handlerWrapper = function(event: Event) {
            const root: HTMLElement = event.target !== document
                ? (event.target as HTMLElement).closest('[data-discovery-instance-id]')
                : null;

            if (root && root.dataset.discoveryInstanceId === instanceId) {
                handler.call(this, event);
            }
        };

        document.addEventListener(eventName, handlerWrapper, options);
        return () => document.removeEventListener(eventName, handlerWrapper, options);
    }

    addBadge(
        caption: string | ((el: HTMLElement) => void),
        action: (this: HTMLElement, event?: Event) => void,
        visible?: (host: this) => boolean
    ): Badge {
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

    scheduleRender(subject: "page" | "sidebar") {
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

    cancelScheduledRender(subject: "page" | "sidebar") {
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
        this.cancelScheduledRender('sidebar');

        if (this.view.has('sidebar')) {
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

    encodePageHash(pageId: string, pageRef: string, pageParams?: Object) {
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

    decodePageHash(hash: string) {
        const parts = hash.substr(1).split('&');
        const [pageId, pageRef] = (parts.shift() || '').split(':').map(unescape);
        const decodeParams = getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams);
        const searchParams = Array.prototype.slice.call(new URLSearchParams(parts.join('&')));
        const pageParams = decodeParams(searchParams.reduce((map, [key, value]) => {
            map[key] = value || true;
            return map;
        }, {}));

        return {
            pageId: pageId || this.defaultPageId,
            pageRef,
            pageParams
        };
    }

    getPageOption(name: string, fallback: any) {
        const page = this.page.get(this.pageId);

        return page && name in page.options ? page.options[name] : fallback;
    }

    setPage(pageId: string, pageRef?: string, pageParams?: Object, replace = false) {
        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams),
            replace
        );
    }

    setPageParams(pageParams: Object, replace = false) {
        return this.setPageHash(
            this.encodePageHash(this.pageId, this.pageRef, pageParams),
            replace
        );
    }

    setPageHash(hash: string, replace = false) {
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
        this.cancelScheduledRender('page');

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
