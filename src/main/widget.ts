/* eslint-env browser */

import jora from 'jora';
import { createElement } from '../core/utils/dom.js';
import injectStyles, { Style } from '../core/utils/inject-styles.js';
import { deepEqual } from '../core/utils/compare.js';
import { DarkModeController, InitValue } from '../core/darkmode.js';
import PageRenderer, { PageOptionName, PageOptions } from '../core/page.js';
import ViewRenderer, { SingleViewConfig } from '../core/view.js';
import PresetRenderer from '../core/preset.js';
import { Observer } from '../core/observer.js';
import inspector from '../extensions/inspector.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { WidgetNavigation } from '../nav/index.js';
import { Model, ModelEvents, ModelOptions, PageParams, PageRef, Query, SetDataOptions } from './model.js';
import type { Dataset } from '../core/utils/load-data.js';
import type Progressbar from '../core/utils/progressbar.js';

export type RenderSubject = typeof renderSubjects[number];
export type ValueAnnotation = { query: Query, [key: string]: any };
export type ValueAnnotationContext = {
    parent: ValueAnnotationContext | null;
    host: any;
    key: string | number;
    index: number;
};
export type SetDataProgressOptions = Partial<{
    dataset: Dataset;
    progressbar: Progressbar;
}>;

const renderScheduler = new WeakMap<Widget, Set<RenderSubject> & { timer?: Promise<void> | null }>();
const renderSubjects = ['sidebar', 'page'] as const;

const defaultEncodeParams = (params: [string, unknown][]) => params;
const defaultDecodeParams = (pairs: [string, unknown][]) => Object.fromEntries(pairs);

function setDatasetValue(el: HTMLElement, key: string, value: any) {
    if (value) {
        el.dataset[key] = value;
    } else {
        delete el.dataset[key];
    }
}

function getPageOption<K extends PageOptionName>(host: Widget, pageId: string, name: K, fallback: PageOptions[K]) {
    const options = host.page.get(pageId)?.options;

    return options !== undefined && Object.hasOwn(options, name)
        ? options[name]
        : fallback;
}

function getPageMethod<K extends PageOptionName>(host: Widget, pageId: string, name: K, fallback: PageOptions[K]) {
    const method = getPageOption(host, pageId, name, fallback);

    return typeof method === 'function'
        ? method
        : fallback;
}

export interface WidgetEvents extends ModelEvents {
    startSetData: [subscribe: (...args: Parameters<Progressbar['subscribeSync']>) => void];
    pageHashChange: [replace: boolean];
}
export interface WidgetOptions<T = Widget> extends ModelOptions<T> {
    container: HTMLElement;
    styles: Style[];

    compact: boolean;
    darkmode: InitValue;
    darkmodePersistent: boolean;

    defaultPage: string;
    defaultPageId: string;
    discoveryPageId: string;
    reportToDiscoveryRedirect: boolean;

    inspector: boolean;
}
type WidgetOptionsBind = WidgetOptions; // to fix: Type parameter 'Options' has a circular default.

export class Widget<
    Options extends WidgetOptions = WidgetOptionsBind,
    Events extends WidgetEvents = WidgetEvents
> extends Model<Options, Events> {
    darkmode: DarkModeController;
    inspectMode: Observer<boolean>;

    view: ViewRenderer;
    nav: WidgetNavigation;
    preset: PresetRenderer;
    page: PageRenderer;

    annotations: ValueAnnotation[];

    defaultPageId: string;
    discoveryPageId: string;
    reportToDiscoveryRedirect: boolean; // TODO: to make bookmarks work, remove sometime in the future
    pageId: string;
    pageRef: PageRef;
    pageParams: Record<string, any>;
    pageHash: string;

    dom: {
        ready: Promise<void>;
        wrapper: HTMLElement;
        root: HTMLElement | ShadowRoot;
        container: HTMLElement;
        nav: HTMLElement;
        sidebar: HTMLElement;
        content: HTMLElement;
        pageContent: HTMLElement;
        detachDarkMode: null | (() => void);
    };
    queryExtensions: Record<string, (...args: unknown[]) => any>;

    constructor(options: Partial<Options>) {
        const {
            extensions,
            logLevel,
            darkmode = 'disabled',
            darkmodePersistent = false,
            defaultPage,
            defaultPageId,
            discoveryPageId,
            reportToDiscoveryRedirect = true,
            inspector: useInspector = false
        } = options || {};

        super({
            ...options,
            logLevel: logLevel || 'perf',
            extensions: undefined
        });

        this.darkmode = new DarkModeController(darkmode, darkmodePersistent);
        this.inspectMode = new Observer(false);
        this.initDom();

        this.action
            .on('define', () => {
                if (this.context) {
                    this.scheduleRender();
                }
            })
            .on('revoke', () => {
                if (this.context) {
                    this.scheduleRender();
                }
            });

        this.view = new ViewRenderer(this);
        this.nav = new WidgetNavigation(this);
        this.preset = new PresetRenderer(this.view);
        this.page = new PageRenderer(this, this.view).on('define', (pageId) => {
            // FIXME: temporary solution to avoid missed custom page's `decodeParams` method call on initial render
            if (this.pageId === pageId && this.pageHash !== '#') {
                const hash = this.pageHash;
                this.pageHash = '#';
                this.setPageHash(hash);
                this.cancelScheduledRender();
            }
        });
        renderScheduler.set(this, new Set());

        this.defaultPageId = defaultPageId || 'default';
        this.discoveryPageId = discoveryPageId || 'discovery';
        this.reportToDiscoveryRedirect = Boolean(reportToDiscoveryRedirect); // TODO: to make bookmarks work, remove sometime in the future
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams);
        this.annotations = [];

        this.apply(views);
        this.apply(pages);
        this.apply(extensions);

        if (defaultPage) {
            this.page.define(this.defaultPageId, defaultPage);
        }

        if (useInspector) {
            this.apply(inspector);
        }

        for (const { name, page, lookup } of this.objectMarkers.values) {
            if (page && !this.page.isDefined(page)) {
                this.log('error', `Page reference "${page}" in object marker "${name}" doesn't exist`);
            }

            this.annotations.push({
                query(value: unknown, context: ValueAnnotationContext) {
                    const marker = // annotateScalars ||
                        (value !== null && typeof value === 'object')
                            ? lookup(value)
                            : null;

                    if (marker !== null && marker.object !== context.host) {
                        return {
                            place: 'before',
                            style: 'badge',
                            text: name,
                            href: marker.href
                        };
                    }
                }
            });
        }

        this.nav.render(this.dom.nav, this.data, this.getRenderContext());
        this.setContainer(this.options.container);
    }

    //
    // Data
    //

    async setData(data: unknown, context: unknown, options?: SetDataOptions & { render?: boolean }) {
        options = options || {};

        await super.setData(data, options);

        this.context = context || {};

        // run after data is prepared and set
        if ('render' in options === false || options.render) {
            this.scheduleRender();
        }
    }

    async setDataProgress(data: unknown, context: unknown, options?: SetDataProgressOptions) {
        const {
            dataset,
            progressbar
        } = options || {};

        this.emit('startSetData', (...args: Parameters<Progressbar['subscribeSync']>) =>
            progressbar?.subscribeSync(...args)
        );

        // set new data & context
        await progressbar?.setState({ stage: 'prepare' });
        await this.setData(data, context, {
            dataset,
            setPrepareWorkTitle: progressbar?.setStateStep.bind(progressbar),
            render: false
        });

        // await dom is ready and everything is rendered
        await progressbar?.setState({ stage: 'initui' });
        this.scheduleRender();
        await Promise.all([
            this.dom.wrapper.parentNode ? this.dom.ready : true,
            renderScheduler.get(this)?.timer
        ]);

        // finish progress
        progressbar?.finish();
    }

    //
    // Data query
    //

    queryToConfig(view: string, query: string): SingleViewConfig {
        const { ast } = jora.syntax.parse(query);
        const config: SingleViewConfig = { view };

        if (ast.type !== 'Block') {
            throw new SyntaxError('[Discovery] Widget#queryToConfig(): query root must be a "Block"');
        }

        if (ast.body.type !== 'Object') {
            throw new SyntaxError('[Discovery] Widget#queryToConfig(): query root must return an "Object"');
        }

        for (const entry of ast.body.properties) {
            if (entry.type !== 'ObjectEntry') {
                throw new SyntaxError('[Discovery] Widget#queryToConfig(): unsupported object entry type "' + entry.type + '"');
            }

            let key: string;
            let value = entry.value;
            switch (entry.key.type) {
                case 'Literal':
                    key = entry.key.value;
                    break;

                case 'Identifier':
                    key = entry.key.name;
                    value ||= entry.key;
                    break;

                case 'Reference':
                    key = entry.key.name.name;
                    value ||= entry.key;
                    break;

                default:
                    throw new SyntaxError('[Discovery] Widget#queryToConfig(): unsupported object key type "' + entry.key.type + '"');
            }

            if (key === 'view' || key === 'postRender') {
                throw new SyntaxError('[Discovery] Widget#queryToConfig(): set a value for "' + key + '" property in shorthand notation is prohibited');
            }

            // when / data / whenData properties take string values as a jora query
            // that's why we don't need for a special processing
            if (key === 'when' || key === 'data' || key === 'whenData') {
                // When value is a literal there is no need to compute them using a query,
                // so add such values to the config as is. However, this doesn't work for string values
                // since it will be treated as a query
                config[key] = value.type === 'Literal' && typeof value.value !== 'string'
                    ? value.value
                    : jora.syntax.stringify(value);
            } else {
                // We can use literal values as is excluding strings which start with '=',
                // since it's an indicator that the string is a query
                config[key] = value.type === 'Literal' && (typeof value.value !== 'string' || value.value[0] !== '=')
                    ? value.value
                    : '=' + jora.syntax.stringify(value);
            }
        }

        return config;
    }

    //
    // UI
    //

    initDom() {
        const wrapper = createElement('div', 'discovery init');
        const shadow = wrapper.attachShadow({ mode: 'open' });
        const readyStyles = injectStyles(shadow, this.options.styles);
        const container = shadow.appendChild(createElement('div'));
        const pageContent = createElement('article');
        const nav = createElement('div', 'discovery-nav discovery-hidden-in-dzen');
        const sidebar = createElement('nav', 'discovery-sidebar discovery-hidden-in-dzen');
        const content = createElement('main', 'discovery-content', [pageContent]);

        this.dom = {
            ready: readyStyles,
            wrapper,
            root: shadow,
            container,
            nav,
            sidebar,
            content,
            pageContent,
            detachDarkMode: this.darkmode.subscribe(
                dark => container.classList.toggle('discovery-root-darkmode', dark),
                true
            )
        };

        container.classList.add('discovery-root', 'discovery');
        container.append(nav, sidebar, content);

        // TODO: use Navigation API when it become mature and wildly supported (https://developer.chrome.com/docs/web-platform/navigation-api/)
        shadow.addEventListener('click', (event) => {
            const linkEl = (event.target as HTMLElement)?.closest('a');

            // do nothing when there is no <a> in target's ancestors, or it's an external link
            if (!linkEl || linkEl.getAttribute('target')) {
                return;
            }

            // do nothing when the has different origin or pathname
            if (linkEl.origin !== location.origin || linkEl.pathname !== location.pathname) {
                return;
            }

            event.preventDefault();

            if (!linkEl.classList.contains('ignore-href')) {
                this.setPageHash(linkEl.hash);
            }
        }, true);

        this.dom.ready.then(() => {
            getComputedStyle(this.dom.wrapper).opacity; // trigger repaint
            this.dom.wrapper.classList.remove('init');
        });
    }

    setContainer(container?: HTMLElement) {
        if (container instanceof HTMLElement) {
            container.append(this.dom.wrapper);
        } else {
            this.dom.wrapper.remove();
        }
    }

    disposeDom() {
        if (typeof this.dom.detachDarkMode === 'function') {
            this.dom.detachDarkMode();
            this.dom.detachDarkMode = null;
        }

        this.dom.container.remove();
        this.dom = null as any;
    }

    addGlobalEventListener<E extends keyof DocumentEventMap>(
        type: E,
        listener: (e: DocumentEventMap[E]) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        document.addEventListener(type, listener, options);
        return () => document.removeEventListener(type, listener, options);
    }

    addHostElEventListener<E extends keyof HTMLElementEventMap>(
        type: E,
        listener: (e: HTMLElementEventMap[E]) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        const el = this.dom.container;

        el.addEventListener(type, listener, options);
        return () => el.removeEventListener(type, listener, options);
    }

    //
    // Render common
    //

    scheduleRender(subject?: RenderSubject) {
        if (subject === undefined) {
            for (const subject of renderSubjects) {
                this.scheduleRender(subject);
            }
            return;
        }

        const scheduledRenders = renderScheduler.get(this);

        if (scheduledRenders === undefined || scheduledRenders?.has(subject)) {
            return;
        }

        scheduledRenders.add(subject);

        if (scheduledRenders.timer) {
            return;
        }

        scheduledRenders.timer = Promise.resolve().then(async () => {
            for (const subject of scheduledRenders) {
                switch (subject) {
                    case 'sidebar':
                        await this.renderSidebar();
                        break;
                    case 'page':
                        await this.renderPage();
                        break;
                }
            }

            scheduledRenders.timer = null;
        });

        return scheduledRenders.timer;
    }

    cancelScheduledRender(subject?: RenderSubject) {
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
            actions: this.action.actionMap,
            datasets: this.datasets,
            data: this.data,
            ...this.context
        };
    }

    //
    // Sidebar
    //

    renderSidebar() {
        // cancel scheduled renderSidebar
        renderScheduler.get(this)?.delete('sidebar');

        if (this.hasDatasets() && this.view.isDefined('sidebar')) {
            const renderStartTime = Date.now();
            const data = this.data;
            const context = this.getRenderContext();

            this.view.setViewRoot(this.dom.sidebar, 'sidebar', { data, context });
            this.dom.sidebar.innerHTML = '';

            return this.view.render(this.dom.sidebar, 'sidebar', data, context)
                .finally(() => this.log('perf', `Sidebar rendered in ${Date.now() - renderStartTime}ms`));
        }
    }

    //
    // Page
    //

    encodePageHash(pageId: string, pageRef: PageRef = null, pageParams?: PageParams) {
        const encodedPageId = pageId || this.defaultPageId;
        const encodeParams = getPageMethod(this, pageId, 'encodeParams', defaultEncodeParams);
        const encodedParams: [string, any][] | string = encodeParams(pageParams || {});

        return super.encodePageHash(
            encodedPageId !== this.defaultPageId ? encodedPageId : '',
            pageRef,
            encodedParams
        );
    }

    decodePageHash(hash: string) {
        const { pageId, pageRef, pageParams } = super.decodePageHash(
            hash,
            pageId => getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams)
        );

        return {
            pageId: pageId || this.defaultPageId,
            pageRef,
            pageParams
        };
    }

    setPage(pageId: string, pageRef: PageRef = null, pageParams?: PageParams, replace = false) {
        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams),
            replace
        );
    }

    setPageRef(pageRef: PageRef = null, replace = false) {
        return this.setPage(this.pageId, pageRef, this.pageParams, replace);
    }

    setPageParams(pageParams: PageParams, replace = false) {
        return this.setPage(this.pageId, this.pageRef, pageParams, replace);
    }

    setPageHash(hash: string, replace = false) {
        const { pageId, pageRef, pageParams } = this.decodePageHash(hash);

        // TODO: remove sometime in the future
        if (this.reportToDiscoveryRedirect && pageId === 'report') {
            setTimeout(() => this.pageId === 'report' && this.setPage('discovery', this.pageRef, this.pageParams, true));
        }

        if (this.pageId !== pageId ||
            this.pageRef !== pageRef ||
            !deepEqual(this.pageParams, pageParams)) {

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
        renderScheduler.get(this)?.delete('page');

        const data = this.data;
        const context = this.getRenderContext();
        const { pageEl, renderState, config } = this.page.render(
            this.dom.pageContent,
            this.pageId,
            data,
            context
        );

        this.view.setViewRoot(pageEl, 'Page: ' + this.pageId, {
            inspectable: false,
            config,
            data,
            context
        });

        this.dom.pageContent = pageEl;
        this.nav.render(this.dom.nav, data, context);

        setDatasetValue(this.dom.container, 'page', this.pageId);
        setDatasetValue(this.dom.container, 'dzen', Boolean(this.pageParams.dzen));
        setDatasetValue(this.dom.container, 'compact', Boolean(this.options.compact));

        renderState.then(() => {
            if (this.pageParams['!anchor']) {
                const el: HTMLElement | null = pageEl.querySelector('#' + CSS.escape('!anchor:' + this.pageParams['!anchor']));

                if (el) {
                    const pageHeaderEl: HTMLElement | null = pageEl.querySelector('.view-page-header'); // TODO: remove, should be abstract

                    el.style.scrollMargin = pageHeaderEl ? pageHeaderEl.offsetHeight + 'px' : '';
                    el.scrollIntoView(true);
                }
            }
        });

        return renderState;
    }
}
