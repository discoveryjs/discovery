/* eslint-env browser */

import type { ModelEvents, ModelOptions, PageAnchor, PageParams, PageRef, PageHashState, PageHashStateWithAnchor, SetDataOptions } from './model.js';
import type { Dataset } from '../core/utils/load-data.js';
import type { InjectStyle } from '../core/utils/inject-styles.js';
import type { PageOptionName, PageOptions } from '../core/page.js';
import type { SingleViewConfig } from '../core/view.js';
import type { Progressbar } from '../core/utils/progressbar.js';
import { createElement } from '../core/utils/dom.js';
import { injectStyles } from '../core/utils/inject-styles.js';
import { deepEqual } from '../core/utils/compare.js';
import { hasOwn } from '../core/utils/object-utils.js';
import { Model } from './model.js';
import { Observer } from '../core/observer.js';
import { ColorScheme, ColorSchemeState } from '../core/color-scheme.js';
import { ViewModelNavigation } from '../nav/index.js';
import { PageRenderer } from '../core/page.js';
import { ViewRenderer } from '../core/view.js';
import { PresetRenderer } from '../core/preset.js';
import inspector from '../extensions/inspector.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import jora from 'jora';

export type RenderSubject = typeof renderSubjects[number];
export type SetDataProgressOptions = Partial<{
    dataset: Dataset;
    progressbar: Progressbar;
}>;

const renderSubjects = ['nav', 'sidebar', 'page'] as const;
const noop = () => {};

const defaultEncodeParams = (params: [string, unknown][]) => params;
const defaultDecodeParams = (pairs: [string, unknown][]) => Object.fromEntries(pairs);

function setDatasetValue(el: HTMLElement, key: string, value: any) {
    if (value) {
        el.dataset[key] = value;
    } else {
        delete el.dataset[key];
    }
}

function getPageOption<K extends PageOptionName>(host: ViewModel, pageId: string, name: K, fallback: PageOptions[K]) {
    const options = host.page.get(pageId)?.options;

    return options !== undefined && hasOwn(options, name)
        ? options[name]
        : fallback;
}

function getPageMethod<K extends PageOptionName>(host: ViewModel, pageId: string, name: K, fallback: PageOptions[K]) {
    const method = getPageOption(host, pageId, name, fallback);

    return typeof method === 'function'
        ? method
        : fallback;
}

export interface ViewModelEvents extends ModelEvents {
    startSetData: [subscribe: Progressbar['subscribeSync']];
    pageStateChange: [prev: PageHashState];
    pageAnchorChange: [prev: string | null];
    pageHashChange: [replace: boolean];
}
export interface ViewModelOptions<T = ViewModel> extends ModelOptions<T> {
    container: HTMLElement;
    styles: InjectStyle[];

    compact: boolean;
    colorScheme: ColorSchemeState;
    colorSchemePersistent: boolean;

    defaultPage: string;
    defaultPageId: string;
    discoveryPageId: string;
    reportToDiscoveryRedirect: boolean;

    inspector: boolean;

    /** @deprecated Legacy option, use colorScheme instead */
    darkmode: ColorSchemeState;
    /** @deprecated Legacy option, use colorSchemePersistent instead */
    darkmodePersistent: boolean;
}
type ViewModelOptionsBind = ViewModelOptions; // to fix: Type parameter 'Options' has a circular default.

export class ViewModel<
    Options extends ViewModelOptions = ViewModelOptionsBind,
    Events extends ViewModelEvents = ViewModelEvents
> extends Model<Options, Events> {
    compact: boolean;
    colorScheme: ColorScheme;
    inspectMode: Observer<boolean>;

    view: ViewRenderer;
    nav: ViewModelNavigation;
    preset: PresetRenderer;
    page: PageRenderer;
    #renderScheduler: Set<RenderSubject> & { timer?: ReturnType<typeof setTimeout> | null };
    #renderSchedulerTimeout: number;

    defaultPageId: string;
    discoveryPageId: string;
    reportToDiscoveryRedirect: boolean; // TODO: to make bookmarks work, remove sometime in the future
    pageId: string;
    pageRef: PageRef;
    pageParams: Record<string, any>;
    pageAnchor: PageAnchor;
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
        detachColorScheme: null | (() => void);
    };
    queryExtensions: Record<string, (...args: unknown[]) => any>;

    constructor(options: Partial<Options>) {
        const {
            container,
            styles,
            extensions,
            logLevel,
            compact,
            darkmode = 'light-only', // for backward compatibility
            darkmodePersistent = false, // for backward compatibility
            colorScheme = darkmode,
            colorSchemePersistent = darkmodePersistent,
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

        if ('darkmode' in options || 'darkmodePersistent' in options) {
            this.logger.warn('ViewModel "darkmode" option is deprecated, use "colorScheme" instead');
        }

        this.compact = Boolean(compact);
        this.colorScheme = new ColorScheme(colorScheme, colorSchemePersistent);
        this.inspectMode = new Observer(false);
        this.initDom(styles);

        this.view = new ViewRenderer(this);
        this.nav = new ViewModelNavigation(this);
        this.preset = new PresetRenderer(this.view);
        this.page = new PageRenderer(this, this.view);
        this.#renderScheduler = new Set();
        this.#renderSchedulerTimeout = 16; // for the first render, following will be with 0

        this.defaultPageId = defaultPageId || 'default';
        this.discoveryPageId = discoveryPageId || 'discovery';
        this.reportToDiscoveryRedirect = Boolean(reportToDiscoveryRedirect); // TODO: to make bookmarks work, remove sometime in the future
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageAnchor = null;
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams, this.pageAnchor);

        // extend with default views & pages
        this.apply(views);
        this.apply(pages);

        if (defaultPage) {
            this.page.define(this.defaultPageId, defaultPage);
        }

        if (useInspector) {
            this.apply(inspector);
        }

        // custom extensions
        this.apply(extensions);

        // re-set pageHash to update pageParams in case the current page was changed
        // or redefined, and it includes custom decodeParams
        this.setPageHash(this.pageHash);

        // append DOM structure to a container
        this.setContainer(container);

        // schedule rendering
        this.scheduleRender();

        // check if all page values used in markers (defined during setup) exist;
        // this ensures early warnings to avoid broken links
        for (const { name, page } of this.objectMarkers.values) {
            if (page && !this.page.isDefined(page)) {
                this.logger.error(`Page reference "${page}" in object marker "${name}" doesn't exist`);
            }
        }
    }

    initRenderTriggers() {
        this.on('context', () => this.scheduleRender());
        this.on('unloadData', () => this.scheduleRender());
        this.on('pageStateChange', () => this.scheduleRender());
        this.on('pageAnchorChange', () => this.applyPageAnchor());

        this.action
            .on('define', () => this.scheduleRender())
            .on('revoke', () => this.scheduleRender());

        this.page.on('define', (pageId) => {
            if (this.pageId === pageId) {
                this.setPageHash(this.pageHash);

                // enforce page render, since page's definition was changed
                this.scheduleRender('page');
            }
        });
    }

    //
    // Data
    //

    async setData(data: unknown, options?: SetDataOptions & { render?: boolean }) {
        const { render = true } = options || {};

        await super.setData(data, options);

        // run after data is prepared and set
        if (render) {
            this.scheduleRender();
        }
    }

    async setDataProgress(data: unknown, context: unknown, options?: SetDataProgressOptions) {
        const {
            dataset,
            progressbar
        } = options || {};

        this.cancelScheduledRender();
        this.emit('startSetData', (...args: Parameters<Progressbar['subscribeSync']>) =>
            progressbar?.subscribeSync(...args) || (() => {})
        );

        // set new data & context
        await progressbar?.setState({ stage: 'prepare' });
        await this.setData(data, {
            dataset,
            setPrepareWorkTitle: progressbar?.setStateStep.bind(progressbar),
            render: false
        });

        // await dom is ready and everything is rendered
        await progressbar?.setState({ stage: 'initui' });
        this.scheduleRender();
        await Promise.all([
            this.dom.wrapper.parentNode ? this.dom.ready : true,
            this.enforceScheduledRenders()
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
            throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): query root must be a "Block"');
        }

        if (ast.body.type !== 'Object') {
            throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): query root must return an "Object"');
        }

        for (const entry of ast.body.properties) {
            if (entry.type !== 'ObjectEntry') {
                throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): unsupported object entry type "' + entry.type + '"');
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
                    throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): unsupported object key type "' + entry.key.type + '"');
            }

            if (key === 'view' || key === 'postRender') {
                throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): set a value for "' + key + '" property in shorthand notation is prohibited');
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

    initDom(styles?: InjectStyle[]) {
        const wrapper = createElement('div', 'discovery');
        const shadow = wrapper.attachShadow({ mode: 'open' });
        const container = shadow.appendChild(createElement('div'));
        const pageContent = createElement('article');
        const nav = createElement('div', 'discovery-nav discovery-hidden-in-dzen');
        const sidebar = createElement('nav', 'discovery-sidebar discovery-hidden-in-dzen');
        const content = createElement('main', 'discovery-content', [pageContent]);

        const readyStyles = injectStyles(shadow,
            this.info.icon
                ? styles?.concat(`.discovery-root{--discovery-app-icon:url(${JSON.stringify(this.info.icon)}`)
                : styles
        );

        this.dom = {
            ready: readyStyles,
            wrapper,
            root: shadow,
            container,
            nav,
            sidebar,
            content,
            pageContent,
            detachColorScheme: this.colorScheme.subscribe(
                value => container.classList.toggle('discovery-root-darkmode', value === 'dark'),
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

            // do nothing when the link has different origin or pathname
            if (linkEl.origin !== location.origin || linkEl.pathname !== location.pathname) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (!linkEl.classList.contains('ignore-href')) {
                if (!this.setPageHash(linkEl.hash)) {
                    this.applyPageAnchor();
                };
            }
        }, true);
    }

    setContainer(container?: HTMLElement) {
        if (container instanceof HTMLElement) {
            container.append(this.dom.wrapper);
        } else {
            this.dom.wrapper.remove();
        }
    }

    disposeDom() {
        if (typeof this.dom.detachColorScheme === 'function') {
            this.dom.detachColorScheme();
            this.dom.detachColorScheme = null;
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
        const subjects = subject ? [subject] : renderSubjects;

        for (const subject of subjects) {
            this.#renderScheduler.add(subject);
        }

        // Previously, we would exit here if nothing changed in the scheduled render list
        // or if some renders were already scheduled. However, this approach led to scenarios
        // where a render would occur behind events on the event loop. Now, if `scheduleRender()`
        // is called, we assume that some events are pending on the event loop and that a render
        // should await until they are processed. Therefore, we reschedule the render to the end
        // of the event loop.
        if (this.#renderScheduler.timer) {
            clearTimeout(this.#renderScheduler.timer);
        }

        // Use `setTimeout()` to ensure that everything on the event loop is processed;
        // previously, `Promise.resolve()` was used, but this proved suboptimal,
        // especially in embed scenario, where rendering occurs with every new `postMessage()`.
        // Since messages are queued on the event loop and `Promise.resolve()` is processed
        // in a micro-task batch, each "defineAction" (which is usually called several times
        // on the host side) produces a separate message, and rendering occurs with every such message.
        this.#renderScheduler.timer = setTimeout(
            () => this.enforceScheduledRenders(),
            this.#renderSchedulerTimeout
        );

        this.logger.debug(`Scheduled renders: ${[...this.#renderScheduler].join(', ')} (requested: ${subject || 'all'})`);
    }

    async enforceScheduledRenders() {
        const renders = [...this.#renderScheduler];

        this.logger.debug(`Enforce scheduled renders: ${renders.join(', ') || 'none'}`);

        // ensure the timer will not fire and scheduled renders are cleaned up
        this.cancelScheduledRender();

        // trigger renders
        for (const subject of renders) {
            switch (subject) {
                case 'nav':
                    await this.renderNav();
                    break;
                case 'sidebar':
                    await this.renderSidebar();
                    break;
                case 'page':
                    await this.renderPage();
                    break;
            }
        }

        // add event handlers to trigger render after the first render
        if (this.initRenderTriggers !== noop) {
            this.initRenderTriggers();
            this.initRenderTriggers = noop;
            this.#renderSchedulerTimeout = 0;
        }
    }

    cancelScheduledRender(subject?: RenderSubject) {
        const scheduledRenders = [...this.#renderScheduler];

        if (subject) {
            this.#renderScheduler.delete(subject);
        } else {
            this.#renderScheduler.clear();
        }

        if (this.#renderScheduler.size === 0 && this.#renderScheduler.timer) {
            clearTimeout(this.#renderScheduler.timer);
            this.#renderScheduler.timer = null;
        }

        if (this.#renderScheduler.size !== scheduledRenders.length) {
            this.logger.debug(`Canceled renders: ${scheduledRenders.join(', ')}`);
        }
    }

    getRenderContext() {
        return {
            page: this.pageId,
            id: this.pageRef,
            params: this.pageParams,
            model: this.info,
            actions: this.action.actionMap,
            datasets: this.datasets,
            data: this.data,
            ...this.context
        };
    }

    //
    // Nav
    //

    protected renderNav() {
        // cancel scheduled renderNav
        this.cancelScheduledRender('nav');

        return this.nav.render(this.dom.nav, this.data, this.getRenderContext());
    }

    //
    // Sidebar
    //

    protected renderSidebar() {
        // cancel scheduled renderSidebar
        this.cancelScheduledRender('sidebar');

        if (this.hasDatasets() && this.view.isDefined('sidebar')) {
            const renderStartTime = Date.now();
            const data = this.data;
            const context = this.getRenderContext();

            this.view.setViewRoot(this.dom.sidebar, 'sidebar', { data, context });
            this.dom.sidebar.innerHTML = '';

            return this.view.render(this.dom.sidebar, 'sidebar', data, context)
                .finally(() => this.logger.perf(`Sidebar rendered in ${Date.now() - renderStartTime}ms`));
        }
    }

    //
    // Page
    //

    encodePageHash(pageId: string, pageRef: PageRef = null, pageParams?: PageParams, pageAnchor: string | null = null) {
        const encodedPageId = pageId || this.defaultPageId;
        const encodeParams = getPageMethod(this, pageId, 'encodeParams', defaultEncodeParams);
        const encodedParams: [string, any][] | string = encodeParams(pageParams || {});

        return super.encodePageHash(
            encodedPageId !== this.defaultPageId ? encodedPageId : '',
            pageRef,
            encodedParams,
            pageAnchor
        );
    }

    decodePageHash(hash: string) {
        const { pageId, pageRef, pageParams, pageAnchor } = super.decodePageHash(
            hash,
            pageId => getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams)
        );

        return {
            pageId: pageId || this.defaultPageId,
            pageRef,
            pageParams,
            pageAnchor
        };
    }

    setPageHashState(pageState: Partial<PageHashState> = {}, replace = false) {
        return this.setPageHashStateWithAnchor({ ...pageState, anchor: null }, replace);
    }
    overridePageHashState(pageState: Partial<PageHashState>, replace = false) {
        return this.setPageHashState({ ...this.getPageHashState(), ...pageState }, replace);
    }
    getPageHashState(): PageHashState {
        return {
            id: this.pageId,
            ref: this.pageRef,
            params: this.pageParams
        };
    }
    setPageHashStateWithAnchor(pageStateWithAnchor: Partial<PageHashStateWithAnchor>, replace = false) {
        const {
            id: pageId = null,
            ref: pageRef = null,
            params: pageParams = {},
            anchor: pageAnchor = null
        } = pageStateWithAnchor;

        return this.setPageHash(
            this.encodePageHash(pageId || this.defaultPageId, pageRef, pageParams, pageAnchor),
            replace
        );
    }
    overridePageHashStateWithAnchor(pageState: Partial<PageHashStateWithAnchor>, replace = false) {
        return this.setPageHashStateWithAnchor({ ...this.getPageHashStateWithAnchor(), ...pageState }, replace);
    }
    getPageHashStateWithAnchor(): PageHashStateWithAnchor {
        return { ...this.getPageHashState(), anchor: this.pageAnchor };
    }

    setPage(pageId: string, pageRef?: PageRef, pageParams?: PageParams, replace = false) {
        return this.setPageHashState({
            id: pageId,
            ref: pageRef,
            params: pageParams
        }, replace);
    }
    setPageRef(pageRef: PageRef = null, replace = false) {
        return this.overridePageHashStateWithAnchor({ ref: pageRef }, replace);
    }
    setPageParams(pageParams: PageParams, replace = false) {
        return this.overridePageHashStateWithAnchor({ params: pageParams }, replace);
    }
    setPageAnchor(pageAnchor: string | null, replace = false) {
        return this.overridePageHashStateWithAnchor({ anchor: pageAnchor }, replace);
    }
    setPageHash(hash: string, replace = false) {
        if (!hash.startsWith('#')) {
            hash = '#' + hash;
        }

        if (hash.startsWith('#!')) {
            hash = this.stripAnchorFromHash(this.pageHash) + (hash.length > 2 ? '&!anchor=' + hash.slice(2) : '');
        }

        const { pageId, pageRef, pageParams, pageAnchor } = this.decodePageHash(hash);

        // TODO: remove sometime in the future
        if (this.reportToDiscoveryRedirect && pageId === 'report' && this.discoveryPageId !== 'report') {
            setTimeout(() => this.pageId === 'report' && this.setPageHashStateWithAnchor({
                id: this.discoveryPageId,
                ref: pageRef,
                params: pageParams,
                anchor: pageAnchor
            }, true));
        }

        if (this.pageId !== pageId ||
            this.pageRef !== pageRef ||
            !deepEqual(this.pageParams, pageParams)) {
            const prev = this.getPageHashState();

            this.pageId = pageId;
            this.pageRef = pageRef;
            this.pageParams = pageParams;
            this.emit('pageStateChange', prev);
        }

        if (pageAnchor !== this.pageAnchor) {
            const prev = this.pageAnchor;

            this.pageAnchor = pageAnchor;
            this.emit('pageAnchorChange', prev);
        }

        if (hash !== this.pageHash) {
            this.pageHash = hash;
            this.emit('pageHashChange', replace);

            return true;
        }

        return false;
    }

    applyPageAnchor(onlyIfPageAnchorPresent = false) {
        const pageEl = this.dom.pageContent;

        if (this.pageAnchor) {
            const anchorEl: HTMLElement | null = pageEl.querySelector('#' + CSS.escape('!anchor:' + this.pageAnchor));

            if (anchorEl) {
                const pageHeaderEl: HTMLElement | null = pageEl.querySelector('.view-page-header'); // TODO: remove, should be abstract

                anchorEl.style.scrollMargin = pageHeaderEl ? pageHeaderEl.offsetHeight + 'px' : '';
                anchorEl.scrollIntoView(true);
            }
        } else if (!onlyIfPageAnchorPresent) {
            this.dom.content.scrollTop = 0;
        }
    }

    protected renderPage() {
        // cancel scheduled renderPage
        this.cancelScheduledRender('page');

        const { data, pageId, pageParams, compact } = this;
        const context = this.getRenderContext();

        this.logger.debug(`Start page "${pageId}" rendering...`);

        const renderStartTime = Date.now();
        const { pageEl, renderState, config } = this.page.render(
            this.dom.pageContent,
            pageId,
            data,
            context
        );

        this.view.setViewRoot(pageEl, `Page: ${pageId}`, {
            inspectable: false,
            config,
            data,
            context
        });

        this.dom.pageContent = pageEl;

        setDatasetValue(this.dom.container, 'page', pageId);
        setDatasetValue(this.dom.container, 'dzen', Boolean(pageParams.dzen));
        setDatasetValue(this.dom.container, 'compact', Boolean(compact));

        renderState.then(async () => {
            await this.dom.ready;
            this.applyPageAnchor(true);
        }).catch((e) => {
            this.logger.error(`Page "${pageId}" render error:`, e);
        });

        return renderState.finally(() => {
            this.logger.perf(`Page "${pageId}" render done in ${(Date.now() - renderStartTime)}ms`);
        });
    }
}
