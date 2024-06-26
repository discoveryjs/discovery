/* eslint-env browser */

import jora from 'jora';
import { createElement } from '../core/utils/dom.js';
import injectStyles from '../core/utils/inject-styles.js';
import { deepEqual } from '../core/utils/compare.js';
import { normalizeEncodings } from '../core/encodings/utils.js';
import ActionManager from '../core/action.js';
import { DarkModeController } from '../core/darkmode.js';
import Emitter from '../core/emitter.js';
import PageRenderer from '../core/page.js';
import ViewRenderer from '../core/view.js';
import PresetRenderer from '../core/preset.js';
import { Observer } from '../core/observer.js';
import inspector from '../extensions/inspector.js';
import * as views from '../views/index.js';
import * as pages from '../pages/index.js';
import { WidgetNavigation } from '../nav/index.js';
import { createDataExtensionApi } from './data-extension-api.js';
import { querySuggestions } from './query-suggestions.js';

const lastSetDataPromise = new WeakMap();
const renderScheduler = new WeakMap();
const logLevels = ['silent', 'error', 'warn', 'info', 'perf', 'debug'];
const logPrefix = '[Discovery]';
const noopLogger = new Proxy({}, { get: () => () => {} });

const defaultEncodeParams = (params) => params;
const defaultDecodeParams = (pairs) => Object.fromEntries(pairs);

function setDatasetValue(el, key, value) {
    if (value) {
        el.dataset[key] = value;
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

export class Widget extends Emitter {
    constructor(options = {}) {
        super();

        this.options = options || {};
        const {
            logLevel,
            logger = console,
            darkmode = 'disabled',
            darkmodePersistent = false,
            defaultPage,
            defaultPageId,
            discoveryPageId,
            reportToDiscoveryRedirect = true,
            extensions,
            inspector: useInspector = false
        } = this.options;

        this.logger = logger || noopLogger;
        this.logLevel = logLevels.includes(logLevel) ? logLevel : 'perf';

        this.darkmode = new DarkModeController(darkmode, darkmodePersistent);
        this.inspectMode = new Observer(false);
        this.initDom();

        this.action = new ActionManager();
        this.action
            .on('define', () => {
                if (this.context) {
                    this.scheduleRender('sidebar');
                    this.scheduleRender('page');
                }
            })
            .on('revoke', () => {
                if (this.context) {
                    this.scheduleRender('sidebar');
                    this.scheduleRender('page');
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

        this.datasets = [];
        this.encodings = normalizeEncodings(options.encodings);
        this.data = undefined;
        this.context = undefined;
        this.prepare = data => data;

        this.defaultPageId = defaultPageId || 'default';
        this.discoveryPageId = discoveryPageId || 'discovery';
        this.reportToDiscoveryRedirect = Boolean(reportToDiscoveryRedirect); // TODO: to make bookmarks work, remove sometime in the future
        this.pageId = this.defaultPageId;
        this.pageRef = null;
        this.pageParams = {};
        this.pageHash = this.encodePageHash(this.pageId, this.pageRef, this.pageParams);

        this.apply(createDataExtensionApi(this));
        this.apply(views);
        this.apply(pages);

        if (extensions) {
            this.apply(extensions);
        }

        if (defaultPage) {
            this.page.define(this.defaultPageId, defaultPage);
        }

        if (useInspector) {
            this.apply(inspector);
        }

        this.nav.render(this.dom.nav, this.data, this.getRenderContext());
        this.setContainer(this.options.container);
    }

    apply(extensions) {
        if (Array.isArray(extensions)) {
            extensions.forEach(extension => this.apply(extension));
        } else if (typeof extensions === 'function') {
            extensions.call(null, this);
        } else if (extensions) {
            this.apply(Object.values(extensions));
        }
    }

    log(levelOrOpts, ...args) {
        const { level, lazy, message, collapsed } = levelOrOpts && typeof levelOrOpts === 'object' ? levelOrOpts : { level: levelOrOpts };
        const levelIndex = logLevels.indexOf(level);

        if (levelIndex > 0 && levelIndex <= logLevels.indexOf(this.logLevel)) {
            const method = level === 'perf' ? 'log' : level;

            if (collapsed) {
                this.logger.groupCollapsed(`${logPrefix} ${message || args?.[0]}`);

                const entries = typeof collapsed === 'function' ? collapsed() : collapsed;
                for (const entry of Array.isArray(entries) ? entries : [entries]) {
                    this.logger[method](...Array.isArray(entry) ? entry : [entry]);
                }

                this.logger.groupEnd();
            } else {
                this.logger[method](logPrefix, ...typeof lazy === 'function' ? lazy() : args);
            }
        } else if (levelIndex === -1) {
            this.logger.error(`${logPrefix} Bad log level "${level}", supported: ${logLevels.slice(1).join(', ')}`);
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

    setData(data, context = {}, options) {
        options = options || {};

        const startTime = Date.now();
        const prepareExtension = createDataExtensionApi(this);
        const checkIsNotPrevented = () => {
            const lastPromise = lastSetDataPromise.get(this);

            // prevent race conditions, perform only if this promise is last one
            if (lastPromise !== setDataPromise) {
                throw new Error('Prevented by another setData()');
            }
        };
        const setDataPromise = Promise.resolve()
            .then(() => {
                checkIsNotPrevented();

                return this.prepare(data, prepareExtension.methods) || data;
            })
            .then((data) => {
                checkIsNotPrevented();

                this.datasets = [{ ...options.dataset, data }];
                this.data = data;
                this.context = context;
                this.apply(prepareExtension);

                this.emit('data');
                this.log('perf', `Data prepared in ${Date.now() - startTime}ms`);
            });

        // mark as last setData promise
        lastSetDataPromise.set(this, setDataPromise);

        // run after data is prepared and set
        if ('render' in options === false || options.render) {
            setDataPromise.then(() => {
                this.scheduleRender('sidebar');
                this.scheduleRender('page');
            });
        }

        return setDataPromise;
    }

    async setDataProgress(data, context, options) {
        const {
            dataset,
            progressbar
        } = options || {};

        this.emit('startSetData', (...args) => progressbar?.subscribeSync(...args));

        // set new data & context
        await progressbar?.setState({ stage: 'prepare' });
        await this.setData(data, context, {
            dataset,
            render: false
        });

        // await dom is ready and everything is rendered
        await progressbar?.setState({ stage: 'initui' });
        this.scheduleRender('sidebar');
        this.scheduleRender('page');
        await Promise.all([
            this.dom.wrapper.parentNode ? this.dom.ready : true,
            renderScheduler.get(this).timer
        ]);

        // finish progress
        await progressbar?.finish();
    }

    unloadData() {
        if (!this.hasDatasets()) {
            return;
        }

        this.datasets = [];
        this.data = undefined;
        this.context = undefined;

        this.scheduleRender('sidebar');
        this.scheduleRender('page');

        this.emit('unloadData');
    }

    hasDatasets() {
        return this.datasets.length !== 0;
    }

    // The method is overriding by createDataExtensionApi().apply()
    resolveValueLinks() {
        return null;
    }

    //
    // Data query
    //

    queryFn(query) {
        switch (typeof query) {
            case 'function':
                return query;

            case 'string': {
                const fn = this.queryFnFromString(query);
                fn.query = query; // FIXME: jora should add it for all kinds of queries
                return fn;
            }
        }
    }

    query(query, data, context) {
        switch (typeof query) {
            case 'function':
                return query(data, context);

            case 'string':
                return this.queryFn(query)(data, context);

            default:
                return query;
        }
    }

    queryBool(...args) {
        return jora.buildin.bool(this.query(...args));
    }

    queryToConfig(view, query) {
        const { ast } = jora.syntax.parse(query);
        const config = { view };

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

            let key;
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

    querySuggestions(query, offset, data, context) {
        return querySuggestions(this, query, offset, data, context);
    }

    pathToQuery(path) {
        return path.map((part, idx) =>
            part === '*'
                ? (idx === 0 ? 'values()' : '.values()')
                : typeof part === 'number' || !/^[a-zA-Z_][a-zA-Z_$0-9]*$/.test(part)
                    ? (idx === 0 ? `$[${JSON.stringify(part)}]` : `[${JSON.stringify(part)}]`)
                    : (idx === 0 ? part : '.' + part)
        ).join('');
    }

    getQueryEngineInfo() {
        return {
            name: 'jora',
            version: jora.version,
            link: 'https://discoveryjs.github.io/jora/#article:jora-syntax'
        };
    }

    //
    // UI
    //

    initDom() {
        const wrapper = createElement('div', 'discovery init');
        const shadow = wrapper.attachShadow({ mode: 'open' });
        const readyStyles = injectStyles(shadow, this.options.styles);
        const container = shadow.appendChild(createElement('div'));

        this.dom = {};
        this.dom.ready = Promise.all([readyStyles]);
        this.dom.wrapper = wrapper;
        this.dom.root = shadow;
        this.dom.container = container;

        container.classList.add('discovery-root', 'discovery');
        container.append(
            this.dom.nav = createElement('div', 'discovery-nav discovery-hidden-in-dzen'),
            this.dom.sidebar = createElement('nav', 'discovery-sidebar discovery-hidden-in-dzen'),
            this.dom.content = createElement('main', 'discovery-content', [
                this.dom.pageContent = createElement('article')
            ])
        );

        // TODO: use Navigation API when it become mature and wildly supported (https://developer.chrome.com/docs/web-platform/navigation-api/)
        shadow.addEventListener('click', (event) => {
            const linkEl = event.target.closest('a');

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

        this.dom.detachDarkMode = this.darkmode.subscribe(
            dark => container.classList.toggle('discovery-root-darkmode', dark),
            true
        );
        this.dom.ready.then(() => {
            getComputedStyle(this.dom.wrapper).opacity; // trigger repaint
            this.dom.wrapper.classList.remove('init');
        });
    }

    setContainer(container) {
        if (container instanceof Node) {
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
        this.dom = null;
    }

    addGlobalEventListener(eventName, handler, options) {
        document.addEventListener(eventName, handler, options);
        return () => document.removeEventListener(eventName, handler, options);
    }

    addHostElEventListener(eventName, handler, options) {
        const el = this.dom.container;

        el.addEventListener(eventName, handler, options);
        return () => el.removeEventListener(eventName, handler, options);
    }

    //
    // Render common
    //

    scheduleRender(subject) {
        const scheduledRenders = renderScheduler.get(this);

        if (scheduledRenders.has(subject)) {
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
        renderScheduler.get(this).delete('sidebar');

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
        const [pageId, pageRef] = hash.substring(hash[0] === '#' ? 1 : 0, delimIndex).split(':').map(decodeURIComponent);
        const decodeParams = getPageMethod(this, pageId || this.defaultPageId, 'decodeParams', defaultDecodeParams);
        const pairs = hash.substr(delimIndex + 1).split('&').filter(Boolean).map(pair => {
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

    setPageRef(pageRef, replace = false) {
        return this.setPage(this.pageId, pageRef, this.pageParams, replace);
    }

    setPageParams(pageParams, replace = false) {
        return this.setPage(this.pageId, this.pageRef, pageParams, replace);
    }

    setPageHash(hash, replace = false) {
        let { pageId, pageRef, pageParams } = this.decodePageHash(hash);

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
        renderScheduler.get(this).delete('page');

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
                const el = pageEl.querySelector('#' + CSS.escape('!anchor:' + this.pageParams['!anchor']));

                if (el) {
                    const pageHeaderEl = pageEl.querySelector('.view-page-header'); // TODO: remove, should be abstract

                    el.style.scrollMargin = pageHeaderEl ? pageHeaderEl.offsetHeight + 'px' : '';
                    el.scrollIntoView(true);
                }
            }
        });

        return renderState;
    }
}
