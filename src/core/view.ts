/* eslint-env browser */

import type { ViewModel } from '../main/view-model.js';
import type { PopupOptions, PopupRender } from '../views/layout/popup.js';
import { createElement, createFragment, isDocumentFragment } from './utils/dom.js';
import { hasOwn } from './utils/object-utils.js';
import { Dictionary } from './dict.js';
import { queryToConfig } from './utils/query-to-config.js';

export type RenderContext = ReturnType<typeof createRenderContext>;
type RenderFunction = (el: HTMLElement | DocumentFragment, props: RenderProps, data?: any, context?: any) => Promise<any> | void;
type NormalizedViewPropsFunction = (data: any, context: { props: RenderProps, context: any }) => any;
type DefineViewRender = RenderFunction | RawViewConfig;
type ViewUsage = any; // TODO: define a type
export type RawViewConfig = SingleViewConfig | RenderFunction | string | RawViewConfig[];
export type NormalizedViewConfig = SingleViewConfig | SingleViewConfig[];
type ClassNameFn = (data: any, context: any) => string | false | null | undefined;
type queryFn = (data: any, context: any) => any;
type query = string | queryFn | boolean;
export type RenderListLimit = number | false | Partial<{
    base: number | false;
    tolerance: number;
    start: number | false;
    startTolerance: number;
}>;
export type RenderListNormalizedLimit = {
    base: number;
    tolerance: number;
    start: number;
    startTolerance: number;
};
export type RenderListOptions = {
    moreContainer: HTMLElement;
    onSliceRender: (restCount: number, offset: number, nextLimit: number, totalCount: number) => void
};

type ConfigTransitionTreeNode = {
    value: any;
    deps: ConfigTransitionTreeNode[];
}

type RootViewInfo = {
    name: string;
    [key: string]: any;
};

type ViewTreeNode = {
    parent: ViewTreeNode | null;
    children: ViewTreeNode[];
    node?: Node | null;
    view?: ViewInfo;
    viewRoot?: RootViewInfo;
}

export interface ViewOptions {
    tag: string | false | null;
    render: DefineViewRender;
    usage: ViewUsage;
    props: NormalizedViewPropsFunction | string;
}
export type ViewOptionsWithoutRender = Exclude<ViewOptions, 'render'>;
export interface NormalizedViewOptions {
    tag: string | null | undefined;
    usage?: ViewUsage;
    props?: NormalizedViewPropsFunction;
}

interface View {
    name: string | false;
    options: NormalizedViewOptions;
    render: RenderFunction;
}
export interface ViewMetadata {
    name: string;
    tag: string | null | undefined;
    group: string[];
    props?: ReturnType<NormalizedViewPropsFunction> | null;
    usage: ViewUsage['examples'];
}
export interface SingleViewConfig {
    view: string | RenderFunction;
    when?: query;
    context?: any;
    data?: any;
    whenData?: query;
    className?: string | ClassNameFn | (string | ClassNameFn)[];
    tooltip?: TooltipConfig | RawViewConfig;
    [key: string]: any;
}
type RenderPropsForbiddenKeys = 'view' | 'when' | 'context' | 'data' | 'whenData' | 'postRender' | 'className' | 'tooltip';
type RenderProps = {
    [K in string]: K extends RenderPropsForbiddenKeys ? never : any
}
type PropsTransition = {
    props: any;
    fn: NormalizedViewPropsFunction & { query?: string };
};

interface ViewInfo {
    config: SingleViewConfig;
    skipped?: 'when' | 'whenData';
    props?: any,
    inputData: any;
    inputDataIndex?: number;
    data: any;
    context: any;
};
interface ErrorData {
    type?: string;
    config: SingleViewConfig;
    reason: Error | string;
}

export type TooltipConfig = Partial<{
    showDelay: boolean | number;
    className: string;
    position: PopupOptions['position'];
    positionMode: PopupOptions['positionMode'];
    pointerOffsetX: number;
    pointerOffsetY: number;
    hideOnTriggerClick: boolean;
    ignoreTrigger: PopupOptions['ignoreTrigger'];
    contentPadding: boolean | number | string; // false = 0, true = default
    content: RawViewConfig;
}>;
type TooltipInfo = {
    config: TooltipConfig | TooltipConfig['content'];
    data: any;
    context: any;
};

const STUB_VIEW_OPTIONS: NormalizedViewOptions = Object.freeze({ tag: undefined });
const STUB_CONFIG: SingleViewConfig = Object.freeze({ view: '' });
const configOnlyProps = new Set<RenderPropsForbiddenKeys>([
    'view',
    'when',
    'context',
    'data',
    'whenData',
    'postRender',
    'className',
    'tooltip'
]);

export function isRawViewConfig(value: unknown): value is RawViewConfig {
    return (
        typeof value === 'string' ||
        Array.isArray(value) ||
        (value !== null && typeof value === 'object' && typeof((value as any).view) === 'string')
    );
}

function normalizeLimit(limit: RenderListLimit): RenderListNormalizedLimit {
    let { base, tolerance, start, startTolerance } = typeof limit === 'object' && limit !== null
        ? limit
        : { base: limit, start: limit };

    if (typeof tolerance !== 'number' || !Number.isInteger(tolerance) || tolerance <= 0) {
        tolerance = 0;
    }

    if (startTolerance === undefined) {
        startTolerance = tolerance;
    } else if (typeof startTolerance !== 'number' || !Number.isInteger(tolerance) || tolerance <= 0) {
        tolerance = 0;
    }

    if (typeof base !== 'number' || Number.isNaN(base)) {
        base = base === false ? Infinity : 10;
    }

    if (typeof start !== 'number' || Number.isNaN(start)) {
        start = start === undefined
            ? base
            : start === false ? Infinity : 10;
    }

    return {
        base,
        tolerance,
        start,
        startTolerance
    };
}
function computeLimit(availCount: number, limit: number, tolerance: number) {
    return limit + tolerance >= availCount
        ? availCount
        : limit;
}

function collectViewTree(viewRenderer: ViewRenderer, node: Node, parent: ViewTreeNode, ignoreNodes: Set<Node>) {
    if (node === null || ignoreNodes.has(node)) {
        return;
    }

    const fragmentNodes = viewRenderer.fragmentEls.get(node as DocumentFragment);

    if (fragmentNodes !== undefined) {
        for (const info of fragmentNodes) {
            const child = parent.children.find(child => child.view === info);

            if (child) {
                parent = child;
            } else {
                parent.children.push(parent = {
                    node: node.nodeType !== 8 ? node : null,
                    parent,
                    view: info,
                    children: []
                });
            }
        }
    }

    const rootViewInfo = viewRenderer.rootViewEls.get(node as any);

    if (rootViewInfo !== undefined) {
        parent.children.push(parent = {
            node,
            parent,
            viewRoot: rootViewInfo,
            children: []
        });
    } else {
        const viewInfo = viewRenderer.viewEls.get(node);

        if (viewInfo !== undefined) {
            parent.children.push(parent = {
                node,
                parent,
                view: viewInfo,
                children: []
            });
        }
    }

    if (node.nodeType === 1) {
        for (let child = node.firstChild; child; child = child.nextSibling) {
            collectViewTree(viewRenderer, child, parent, ignoreNodes);
        }
    }
}

function createDefaultRenderErrorView(viewRenderer: ViewRenderer): View {
    return {
        name: 'config-error',
        options: STUB_VIEW_OPTIONS,
        render(el: HTMLElement, config: ErrorData) {
            const blockClassName = 'discovery-buildin-view-render-error';
            const tagEl = createElement('span', 'error-tag');
            const summaryEl = el.appendChild(createElement('span', `${blockClassName}__summary`, [
                tagEl,
                createElement('span', 'reason', [String(config.reason)])
            ]));
            const viewName = typeof config.config.view === 'string' ? config.config.view : null;
            const lastQueryField = (config.reason as any)?.lastQuery;
            const lastQuery = typeof lastQueryField === 'string' && typeof config.config[lastQueryField] === 'string'
                ? config.config[lastQueryField]
                : null;

            el.className = `${blockClassName}`;
            summaryEl.dataset.type = config.type;

            if (lastQueryField) {
                summaryEl.dataset.type = 'query';
                el.style.setProperty('--query-field', `"${lastQueryField}"`);
            }

            if ('config' in config) {
                const renderDetails = (detailsOutputEl: HTMLElement) => {
                    const detailsEl = detailsOutputEl.appendChild(createElement('div', `${blockClassName}__details`));

                    if (viewName) {
                        el.style.setProperty('--view-name', `"${viewName}"`);
                    }

                    // render error text
                    const message = String(config.reason);
                    const stack = typeof config.reason !== 'string' && config.reason.stack
                        ? String(config.reason.stack)
                        : null;
                    detailsEl.append(createElement('pre', `${blockClassName}__message`, [
                        message,
                        stack
                            ? '\n\nStack trace:\n' + (stack.startsWith(message)
                                ? stack.slice(message.length).replace(/^[\r\n]+/, '')
                                : stack)
                            : ''
                    ]));

                    // render view stack
                    const stackTraceEl = detailsEl.appendChild(createElement('div', `${blockClassName}__stack-trace`));
                    const stackTrace = viewRenderer.getViewStackTrace(el.parentNode as HTMLElement, true);

                    if (stackTrace) {
                        for (const entry of stackTrace) {
                            const rootName = 'name' in entry ? entry.name : undefined;
                            const view = entry.config.view;

                            if (rootName) {
                                stackTraceEl.append(createElement('span', 'view-stack-entry root', [rootName]));
                            }

                            stackTraceEl.append(createElement('span', 'view-stack-entry', [
                                typeof view === 'string' && view
                                    ? view
                                    : typeof entry.config === 'function' || typeof view === 'function'
                                        ? 'ƒn'
                                        : '[unknown view]'
                            ]));
                        }
                    }

                    // render view config
                    viewRenderer.render(detailsEl, 'struct{ expanded: true }', config.config);

                    // render last query if any
                    if (lastQuery) {
                        const range = (config.reason as any)?.details?.loc?.range;
                        const queryEl = detailsEl.appendChild(createElement('div', `${blockClassName}__last-query`, [
                            createElement('span', 'query-field', [lastQueryField])
                        ]));

                        viewRenderer.render(queryEl, {
                            view: 'source',
                            source: lastQuery,
                            ranges: range ? [{ range, className: 'error' }] : []
                        });
                    }
                };

                tagEl.classList.add('has-details');
                attachTooltip(viewRenderer, tagEl, {
                    ignoreTrigger: () => el.classList.contains('expanded'),
                    hideOnTriggerClick: true,
                    contentPadding: false,
                    content: renderDetails
                } satisfies TooltipConfig);

                if (viewRenderer.host.dialog) {
                    tagEl.addEventListener('click', () => {
                        viewRenderer.host.dialog.show({
                            titleText: 'Error details',
                            fullViewport: true,
                            contentPadding: false,
                            content: renderDetails
                        });
                    });
                } else {
                    tagEl.classList.add('toggle');
                    tagEl.addEventListener('click', () => {
                        if (el.classList.toggle('expanded')) {
                            renderDetails(el);
                        } else {
                            summaryEl.nextSibling?.remove();
                        }
                    });
                }
            }
        }
    };
}

function condition(
    type: 'when' | 'whenData',
    viewRenderer: ViewRenderer,
    config: SingleViewConfig,
    queryData: any,
    context: any,
    inputData: any,
    inputDataIndex: number | undefined,
    placeholder: Comment
) {
    if (!hasOwn(config, type) || config[type] === undefined) {
        return true;
    }

    if (viewRenderer.host.queryBool(config[type] === true ? '' : config[type], queryData, context)) {
        return true;
    }

    viewRenderer.viewEls.set(placeholder, {
        skipped: type,
        config,
        inputData,
        inputDataIndex,
        data: queryData,
        context
    });

    return false;
}

function computeClassName(viewRenderer: ViewRenderer, className: any, data: any, context: any): string[] | null {
    let classNames = className;

    if (typeof classNames === 'string' && classNames.startsWith('=')) {
        classNames = viewRenderer.host.queryFn(classNames.slice(1));
    }

    if (typeof classNames === 'function') {
        classNames = classNames(data, context);
    }

    if (typeof classNames === 'string') {
        classNames = classNames.trim().split(/\s+/);
    }

    if (Array.isArray(classNames)) {
        classNames = classNames
            .map(item => typeof item === 'function' ? item(data, context) : item)
            .filter(Boolean);

        if (classNames.length) {
            return classNames;
        }
    }

    return null;
}

function applyComputedClassName(viewRenderer: ViewRenderer, el: HTMLElement, className: any, data: any, context: any) {
    const classNames = className
        ? computeClassName(viewRenderer, className, data, context)
        : null;

    if (classNames !== null) {
        el.classList.add(...classNames);
    }
}

async function renderDom(
    viewRenderer: ViewRenderer,
    renderer: View,
    placeholder: Comment,
    config: SingleViewConfig,
    props: RenderProps,
    data?: any,
    context?: any,
    inputData?: any,
    inputDataIndex?: number
) {
    const { tag } = renderer.options;
    const el = tag === null
        ? document.createDocumentFragment()
        : document.createElement(tag || 'div');

    await renderer.render(el, props, data, context);

    if (typeof config.postRender === 'function') {
        await config.postRender(el, config, data, context);
    }

    const info: ViewInfo = {
        config,
        props,
        inputData,
        inputDataIndex,
        data,
        context
    };

    if (!isDocumentFragment(el)) {
        viewRenderer.viewEls.set(el, info);

        if (renderer.name) {
            el.classList.add(`view-${renderer.name}`);
        }

        applyComputedClassName(viewRenderer, el, config.className, data, context);

        if (config.tooltip) {
            attachTooltip(viewRenderer, el, config.tooltip, data, context);
        }
    } else {
        for (const child of el.childNodes) {
            const viewInfos = viewRenderer.fragmentEls.get(child);

            if (viewInfos !== undefined) {
                viewInfos.unshift(info);
            } else {
                viewRenderer.fragmentEls.set(child, [info]);
            }
        }
    }

    placeholder.replaceWith(el);
}

function renderError(viewRenderer: ViewRenderer, reason: Error | string, placeholder: Comment, config: any) {
    return renderDom(viewRenderer, viewRenderer.defaultRenderErrorRenderer, placeholder, STUB_CONFIG, {
        type: 'render',
        reason,
        config
    });
}

function createRenderContext(viewRenderer: ViewRenderer, name: string) {
    return {
        name,
        // block() {
        //     return `view-${name}`;
        // },
        // blockMod(modifierName, value = true) {
        //     return `${this.block()}_${modifierName}${value === true ? '' : '_' + value}`;
        // },
        // element(elementName) {
        //     return `${this.block()}__${elementName}`;
        // },
        // elementMod(elementName, modifierName, value = true) {
        //     return `${this.element(elementName)}_${modifierName}${value === true ? '' : '_' + value}`;
        // },
        normalizeConfig: viewRenderer.normalizeConfig.bind(viewRenderer),
        ensureValidConfig: viewRenderer.ensureValidConfig.bind(viewRenderer),
        composeConfig: viewRenderer.composeConfig.bind(viewRenderer),
        propsFromConfig: viewRenderer.propsFromConfig.bind(viewRenderer),
        computeClassName: computeClassName.bind(null, viewRenderer),
        applyComputedClassName: applyComputedClassName.bind(null, viewRenderer),
        render: viewRenderer.render.bind(viewRenderer),
        listLimit: viewRenderer.listLimit.bind(viewRenderer),
        renderList: viewRenderer.renderList.bind(viewRenderer),
        maybeMoreButtons: viewRenderer.maybeMoreButtons.bind(viewRenderer),
        renderMoreButton: viewRenderer.renderMoreButton.bind(viewRenderer),
        tooltip(el: HTMLElement, config: RenderProps, data?: any, context?: any) {
            if (el && el.nodeType === 1) {
                return attachTooltip(viewRenderer, el, config, data, context);
            } else {
                viewRenderer.host.logger.warn('A tooltip can be attached to a HTML element only');
            }
        }
    };
}

function attachTooltip(viewRenderer: ViewRenderer, el: HTMLElement, config: TooltipConfig | RawViewConfig, data?: any, context?: any) {
    if (viewRenderer.Popup === null) {
        return false;
    }

    el.classList.add('discovery-view-has-tooltip');
    viewRenderer.tooltipEls.set(el, { config, data, context });

    if (viewRenderer.tooltip === null) {
        viewRenderer.tooltip = createTooltip(viewRenderer);
    }
}
function isPopupConfig(value: any): value is TooltipConfig {
    return (
        Boolean(value) &&
        !Array.isArray(value) &&
        typeof value !== 'string' &&
        typeof value !== 'function' &&
        !value.view
    );
}
function ensureNumber(value: unknown, fallback: number): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}
function createTooltip(viewRenderer: ViewRenderer) {
    let classNames: string[] | null = null;
    const popup = new viewRenderer.Popup({
        className: 'discovery-buildin-view-tooltip',
        hoverTriggers: '.discovery-view-has-tooltip',
        position: 'pointer',
        showDelay(triggerEl: HTMLElement) {
            const { config } = viewRenderer.tooltipEls.get(triggerEl) || {};

            return isPopupConfig(config)
                ? config.showDelay ?? true
                : true;
        },
        render(el: HTMLElement, triggerEl: HTMLElement) {
            const { config, data, context } = viewRenderer.tooltipEls.get(triggerEl) || {};
            let position: TooltipConfig['position'] = 'pointer';
            let positionMode: TooltipConfig['positionMode'] = 'natural';
            let pointerOffsetX: TooltipConfig['pointerOffsetX'] = 3;
            let pointerOffsetY: TooltipConfig['pointerOffsetY'] = 3;
            let hideOnTriggerClick: TooltipConfig['hideOnTriggerClick'] = false;
            let ignoreTrigger: TooltipConfig['ignoreTrigger'] = null;
            let contentPadding: TooltipConfig['contentPadding'] = true;
            let content: any = config;

            if (classNames !== null) {
                el.classList.remove(...classNames);
                classNames = null;
            }

            if (isPopupConfig(config)) {
                classNames = computeClassName(viewRenderer, config.className, data, context);

                if (classNames !== null) {
                    el.classList.add(...classNames);
                }

                position = config.position || position;
                positionMode = config.positionMode || positionMode;
                pointerOffsetX = ensureNumber(config.pointerOffsetX, pointerOffsetX);
                pointerOffsetY = ensureNumber(config.pointerOffsetY, pointerOffsetY);
                hideOnTriggerClick = Boolean(config.hideOnTriggerClick);
                ignoreTrigger = config.ignoreTrigger || null;
                contentPadding = config.contentPadding;

                content = config.content;
            }

            popup.position = position;
            popup.positionMode = positionMode;
            popup.pointerOffsetX = pointerOffsetX;
            popup.pointerOffsetY = pointerOffsetY;
            popup.hideOnTriggerClick = hideOnTriggerClick;
            popup.ignoreTrigger = ignoreTrigger;
            popup.contentPadding = contentPadding;

            if (content) {
                return viewRenderer.render(el, content, data, context);
            }

            return viewRenderer.render(el, {
                view: viewRenderer.defaultRenderErrorRenderer.render,
                reason: 'Element marked as having a tooltip but related data is not found'
            });
        }
    });

    return popup;
}

async function render(
    viewRenderer: ViewRenderer,
    container: HTMLElement | DocumentFragment,
    config: NormalizedViewConfig,
    inputData: any,
    inputDataIndex: number | undefined,
    context: any
): Promise<void> {
    if (Array.isArray(config)) {
        await Promise.all(config.map(config =>
            render(viewRenderer, container, config, inputData, inputDataIndex, context)
        ));
        return;
    }

    const queryData = inputData && typeof inputDataIndex === 'number'
        ? inputData[inputDataIndex]
        : inputData;
    let renderer: View | null = null;

    switch (typeof config.view) {
        case 'function':
            renderer = {
                name: false,
                options: STUB_VIEW_OPTIONS,
                render: config.view
            };
            break;

        case 'string':
            if (config.view === 'render') {
                const {
                    config: configQuery = '',
                    context: contextQuery = ''
                } = viewRenderer.propsFromConfig(config, inputData, context);

                renderer = {
                    name: false,
                    options: { tag: null },
                    render(el, _, _data) {
                        const _config = configQuery !== '' ? viewRenderer.host.query(configQuery, queryData, context) : _data;
                        const _context = viewRenderer.host.query(contextQuery, context, queryData);
                        // config only   -> _config=query(data) _data=data
                        // data only     -> _config=query(data) _data=query(data)
                        // config & data -> _config=query(data) _data=query(data)

                        return viewRenderer.render(
                            el,
                            _config,
                            _data !== _config ? _data : queryData,
                            _context
                        );
                    }
                };
            } else if (config.view.startsWith('preset/')) {
                const presetName = config.view.slice(7);

                renderer = {
                    name: false,
                    options: { tag: null },
                    render: viewRenderer.host.preset.get(presetName)?.render ?? (() => {})
                };
            } else {
                renderer = viewRenderer.get(config.view) || null;
            }
            break;
    }

    if (!container) {
        container = document.createDocumentFragment();
    }

    // immediately append a view insert point (a placeholder)
    const placeholder = container.appendChild(document.createComment(''));

    if (!renderer) {
        const errorMsg = typeof config.view === 'string'
            ? 'View `' + config.view + '` is not found'
            : 'Render is not a function';

        viewRenderer.host.logger.error(errorMsg, config);
        return renderError(viewRenderer, errorMsg, placeholder, config);
    }

    let lastQuery: string | null = null;
    try {
        // when -> data -> whenData -> render
        if (condition(lastQuery = 'when', viewRenderer, config, queryData, context, inputData, inputDataIndex, placeholder)) {
            const renderContext = hasOwn(config, lastQuery = 'context')
                ? await viewRenderer.host.query(config.context, queryData, context)
                : context;
            const renderData = hasOwn(config, lastQuery = 'data')
                ? await viewRenderer.host.query(config.data, queryData, renderContext)
                : queryData;

            if (condition(lastQuery = 'whenData', viewRenderer, config, renderData, renderContext, inputData, inputDataIndex, placeholder)) {
                lastQuery = null;

                // use await to catch possible errors in renderDom()
                return await renderDom(
                    viewRenderer,
                    renderer,
                    placeholder,
                    config,
                    viewRenderer.propsFromConfig(config, renderData, renderContext),
                    renderData,
                    renderContext,
                    inputData,
                    inputDataIndex
                );
            }
        }
    } catch (e) {
        e.lastQuery = lastQuery;
        viewRenderer.host.logger.error('View render error:', e);
        return renderError(viewRenderer, e, placeholder, config);
    }
}

type PopupShowArgs = [triggerEl: HTMLElement, render?: PopupRender, showImmediately?: boolean];
export class ViewPopup { // FIXME: that a stub for a Popup, use view/Popup instead
    el: HTMLElement;
    visible: boolean;
    position: TooltipConfig['position'];
    positionMode: TooltipConfig['positionMode'];
    pointerOffsetX: TooltipConfig['pointerOffsetX'];
    pointerOffsetY: TooltipConfig['pointerOffsetY'];
    hideOnTriggerClick: TooltipConfig['hideOnTriggerClick'];
    ignoreTrigger: TooltipConfig['ignoreTrigger'];
    contentPadding: TooltipConfig['contentPadding'];
    // use method definition aside, since stub implementation doesn't use config parameter
    constructor(config: Partial<PopupOptions>);
    constructor() {}

    toggle(...args: PopupShowArgs): void;
    toggle() {}
    show(...args: PopupShowArgs): Promise<void>;
    async show() {}
    hide() {}
    destroy() {}
}

export class ViewRenderer extends Dictionary<View> {
    host: ViewModel;
    defaultRenderErrorRenderer: View;
    viewEls: WeakMap<Node, ViewInfo>;
    rootViewEls: WeakMap<HTMLElement, RootViewInfo>;
    fragmentEls: WeakMap<Node, ViewInfo[]>;
    tooltipEls: WeakMap<HTMLElement, TooltipInfo>;
    configTransitions: WeakMap<object, any>;
    propsTransitions: WeakMap<object, PropsTransition>;

    tooltip: ReturnType<typeof createTooltip> | null;
    Popup = ViewPopup;
    #metadataCache: ViewMetadata[] | null = null;

    constructor(host: ViewModel) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView(this);
        this.resetViewRenderInfo();
        this.tooltip = null;
        this.#metadataCache = null;

        this
            .on('define', () => this.#metadataCache = null)
            .on('revoke', () => this.#metadataCache = null);
    }

    define(name: string, render: DefineViewRender, options?: ViewOptionsWithoutRender): Readonly<View>;
    define(name: string, options: ViewOptions): Readonly<View>;
    define(name: string, _render: DefineViewRender | ViewOptions, _options?: ViewOptions) {
        const options: Partial<ViewOptions> = isRawViewConfig(_render) || typeof _render === 'function'
            ? { ..._options, render: _render }
            : _render;
        const { render = [], ...optionsWithoutRender } = options;
        const { tag, props } = optionsWithoutRender;

        return ViewRenderer.define<View>(this, name, Object.freeze({
            name,
            options: Object.freeze({
                ...options,
                tag: typeof tag === 'string' || tag === undefined ? tag : null,
                props: typeof props === 'string'
                    ? this.host.queryFn(props)
                    : props
            }),
            render: typeof render === 'function'
                ? render.bind(createRenderContext(this, name))
                : (el, _, data, context) => this.render(el, render, data, context)
        } satisfies View));
    }

    #regConfigTransition<T extends object>(res: T, from: any): T {
        this.configTransitions.set(res, from);
        return res;
    }

    normalizeConfig(config: RawViewConfig | RenderFunction): SingleViewConfig | SingleViewConfig[] | null {
        if (!config) {
            return null;
        }

        if (Array.isArray(config)) {
            const arrayOfConfigs: SingleViewConfig[] = [];

            for (const configElement of config) {
                const normalizedConfig = this.normalizeConfig(configElement);

                if (normalizedConfig !== null) {
                    if (Array.isArray(normalizedConfig)) {
                        arrayOfConfigs.push(...normalizedConfig);
                    } else {
                        arrayOfConfigs.push(normalizedConfig);
                    }
                }
            }

            return arrayOfConfigs;
        }

        if (typeof config === 'string') {
            const [, prefix, op, query] = config.match(/^(\S+?)([:{])((?:.|\s)+)$/) || [];

            if (prefix) {
                if (op === '{') {
                    try {
                        return this.#regConfigTransition(
                            queryToConfig(prefix, op + query),
                            config
                        );
                    } catch (error) {
                        return this.#regConfigTransition(
                            this.badConfig(config, error),
                            config
                        );
                    }
                }

                return this.#regConfigTransition({
                    view: prefix,
                    data: query
                }, config);
            }

            return this.#regConfigTransition({
                view: config
            }, config);
        } else if (typeof config === 'function') {
            return this.#regConfigTransition({
                view: config
            }, config);
        }

        return config;
    }

    badConfig(config: any, error: Error | string): SingleViewConfig {
        const errorMsg = typeof error === 'string' ? error : error?.message || 'Unknown error';

        this.host.logger.error(errorMsg, { config, error });

        return {
            view: this.defaultRenderErrorRenderer.render,
            type: 'config',
            reason: errorMsg,
            config
        };
    }

    ensureValidConfig(config: any): NormalizedViewConfig {
        if (Array.isArray(config)) {
            return config.map(item => this.ensureValidConfig(item)).flat();
        }

        if (!config || !config.view) {
            return this.badConfig(config, new Error(!config ? 'Config is not a valid value' : 'Option `view` is missed'));
        }

        return config;
    }

    composeConfig(config: any, extension: any): NormalizedViewConfig {
        config = this.normalizeConfig(config);
        extension = this.normalizeConfig(extension);

        // mix
        if (config && extension) {
            return Array.isArray(config)
                ? config.map(item => this.#regConfigTransition({ ...item, ...extension }, [item, extension]))
                : this.#regConfigTransition({ ...config, ...extension }, [config, extension]);
        }

        return config || extension;
    }

    propsFromConfig(
        config: SingleViewConfig,
        data: any,
        context: any,
        fn: NormalizedViewPropsFunction | null | false | undefined = this.get(config?.view as string)?.options.props
    ) {
        let props: Record<string, any> = {}; // regConfigTransition({}, config);

        for (const [key, value] of Object.entries(config)) {
            // Config only props are not available for view's render
            if (!configOnlyProps.has(key as RenderPropsForbiddenKeys)) {
                props[key] = typeof value === 'string' && value.startsWith('=')
                    ? this.host.query(value.slice(1), data, context)
                    : value;
            }
        }

        if (typeof fn === 'function') {
            const normProps = fn(data, { props, context });

            if (normProps !== null && typeof normProps === 'object' && normProps !== props) {
                this.propsTransitions.set(normProps, { props, fn });
                props = normProps;
            }
        }

        return props;
    }

    render(
        container: HTMLElement | DocumentFragment,
        config: RawViewConfig,
        data?: any,
        context?: any,
        dataIndex?: number
    ) {
        return render(
            this,
            container,
            this.ensureValidConfig(this.normalizeConfig(config)),
            data,
            dataIndex,
            context
        );
    }

    async renderReplace(
        container: HTMLElement | DocumentFragment,
        config: RawViewConfig,
        data?: any,
        context?: any,
        dataIndex?: number
    ) {
        const fragment = createFragment();

        await this.render(fragment, config, data, context, dataIndex);
        container.replaceChildren(fragment);
    }

    renderError(container: HTMLElement | Comment | DocumentFragment, reason: Error | string, config: any) {
        const placeholder = container instanceof Comment
            ? container
            : container.appendChild(document.createComment(''));

        return renderError(this, reason, placeholder, config);
    }

    listLimit(value: any, defaultValue: number) {
        if (value === false) {
            return false;
        }

        if (typeof value === 'object' && value !== null) {
            return typeof value.base === 'undefined'
                ? { ...value, base: defaultValue }
                : value;
        }

        if (!value || isNaN(value)) {
            return defaultValue;
        }

        return Math.max(parseInt(value, 10), 0) || defaultValue;
    }

    renderList(
        container: HTMLElement,
        itemConfig: RawViewConfig,
        data: any[],
        context: any,
        offset: number,
        limit: RenderListLimit,
        moreContainer?: RenderListOptions['moreContainer']
    );
    renderList(
        container: HTMLElement,
        itemConfig: RawViewConfig,
        data: any[],
        context: any,
        offset: number,
        limit: RenderListLimit,
        options?: Partial<RenderListOptions>
    );
    renderList(
        container: HTMLElement,
        itemConfig: RawViewConfig,
        data: any[],
        context: any,
        offset = 0,
        limit: RenderListLimit = false,
        moreContainerOrOptions?: RenderListOptions['moreContainer'] | Partial<RenderListOptions>
    ) {
        const options = moreContainerOrOptions instanceof HTMLElement || (moreContainerOrOptions && 'nodeType' in moreContainerOrOptions)
            ? { moreContainer: moreContainerOrOptions } as Partial<RenderListOptions>
            : moreContainerOrOptions || {};
        const { moreContainer: moreContainerEl, onSliceRender } = options;
        const limitOptions = normalizeLimit(limit);

        const placeholder = container.appendChild(document.createComment(''));
        const fragment = document.createDocumentFragment(); // render into fragment to speed up long list rendering
        const totalCount = data.length;
        const restCount = totalCount - offset;
        const renderCount = offset === 0
            ? computeLimit(restCount, limitOptions.start, limitOptions.startTolerance)
            : computeLimit(restCount, limitOptions.base, limitOptions.tolerance);
        const nextRenderCount = computeLimit(restCount - renderCount, limitOptions.base, limitOptions.tolerance);
        const result = Promise.all(
            data
                .slice(offset, offset + renderCount)
                .map((_, sliceIndex, slice) =>
                    this.render(fragment, itemConfig, data, {
                        ...context,
                        index: offset + sliceIndex,
                        array: data,
                        sliceIndex,
                        slice
                    }, offset + sliceIndex)
                )
        ).then(() => placeholder.replaceWith(fragment));

        if (typeof onSliceRender === 'function') {
            result.then(() => onSliceRender(
                restCount - renderCount,
                offset,
                nextRenderCount,
                totalCount
            ));
        }

        this.maybeMoreButtons(
            moreContainerEl || container,
            null,
            totalCount,
            offset + renderCount,
            nextRenderCount,
            (offset, limit) => this.renderList(
                container,
                itemConfig,
                data,
                context,
                offset,
                limit !== limitOptions.base
                    ? { ...limitOptions, base: limit }
                    : limitOptions,
                options
            )
        );

        return result;
    }

    maybeMoreButtons(
        container: HTMLElement,
        beforeEl: Node | null,
        total: number,
        nextOffset: number,
        nextLimit: number,
        renderMore: (offset: number, limit: number) => any
    ) {
        if (total <= nextOffset) {
            return null;
        }

        const restCount = total - nextOffset;
        const buttons = document.createElement('span');

        if (restCount > nextLimit) {
            this.renderMoreButton(
                buttons,
                'Show ' + nextLimit + ' more...',
                () => renderMore(nextOffset, nextLimit)
            );
        }

        if (restCount > 0) {
            this.renderMoreButton(
                buttons,
                'Show all the rest ' + restCount + ' items...',
                () => renderMore(nextOffset, Infinity)
            );
        }

        if (buttons !== null) {
            buttons.className = 'more-buttons';
            container.insertBefore(buttons, beforeEl);
        }

        return buttons;
    }

    renderMoreButton(container: HTMLElement, caption: string, fn: () => void) {
        const moreButton = document.createElement('button');

        moreButton.className = 'more-button';
        moreButton.innerHTML = caption;
        moreButton.addEventListener('click', () => {
            container.remove();
            fn();
        });

        container.appendChild(moreButton);
    }

    attachTooltip(el: HTMLElement, config: TooltipConfig | RawViewConfig, data?: any, context?: any) {
        return attachTooltip(this, el, config, data, context);
    }

    adoptFragment(fragment: DocumentFragment, probe: Node) {
        const info = this.fragmentEls.get(probe);

        if (info) {
            for (const node of fragment.childNodes) {
                this.fragmentEls.set(node, info);
            }
        }
    }

    setViewRoot(node: HTMLElement, name: string, props: Record<string, any>) {
        this.rootViewEls.set(node, {
            name,
            ...props
        });
    }

    getViewTree(ignore: Node[]) {
        const ignoreNodes = new Set(ignore || []);
        const result: ViewTreeNode[] = [];

        collectViewTree(this, this.host.dom?.container || null, { parent: null, children: result }, ignoreNodes);

        return result;
    }

    getViewStackTrace(el: Node, includeRoots = false) {
        const { container: root } = this.host.dom as { container?: HTMLElement | null };

        if (!root || el instanceof Node === false || !root.contains(el)) {
            return null;
        }

        const stack: (ViewInfo | RootViewInfo)[] = [];
        let cursor: Node | null = el;

        while (cursor !== null && cursor !== root) {
            const viewInfo = this.viewEls.get(cursor);
            const rootInfo = includeRoots ? this.rootViewEls.get(cursor as any) : undefined;

            if (viewInfo !== undefined) {
                stack.push(viewInfo);
            }

            if (rootInfo !== undefined) {
                stack.push(rootInfo);
            }

            cursor = cursor.parentNode;
        }

        if (stack.length === 0) {
            return null;
        }

        return stack.reverse();
    }

    getViewConfigTransitionTree(value: any): ConfigTransitionTreeNode {
        let deps = this.configTransitions.get(value) || [];

        if (!Array.isArray(deps)) {
            deps = [deps];
        }

        return {
            value,
            deps: deps.map(this.getViewConfigTransitionTree, this)
        };
    }

    getViewPropsTransition(value: any): null | PropsTransition & { query: string | null } {
        const transition = this.propsTransitions.get(value) || null;

        return transition && {
            props: transition.props,
            fn: transition.fn,
            query: transition.fn.query || null
        };
    }

    getViewsMetadata() {
        if (this.#metadataCache !== null) {
            return this.#metadataCache;
        }

        const views = [...this.values].sort((a, b) => a.name < b.name ? -1 : 1);
        const groupedViews = new Map<unknown, View[]>();
        const result: ViewMetadata[] = [];

        for (const view of views) {
            const key = view.options.usage || {};
            const group = groupedViews.get(key);

            if (group === undefined) {
                groupedViews.set(key, [view]);
            } else {
                group.push(view);
            }
        }

        for (const groupViews of groupedViews.values()) {
            // FIXME: View['name'] is string | false, but here always string;
            // need to fix the type definition of View interface and remove 'as string' assertion
            const groupViewNames = groupViews.map(view => view.name as string);

            for (const view of groupViews) {
                const { name, options } = view;
                const usage = {
                    examples: [],
                    ...typeof options.usage === 'function'
                        ? options.usage(name, groupViewNames)
                        : Array.isArray(options.usage)
                            ? { examples: options.usage }
                            : options.usage
                };

                const mainDemoAsExample = {};
                let hasMainDemo = false;
                for (const key of Object.keys(usage)) {
                    if (key !== 'examples' && usage[key] !== undefined) {
                        mainDemoAsExample[key] = usage[key];
                        hasMainDemo = true;
                    }
                }

                result.push({
                    // FIXME: View['name'] is string | false, but here always string;
                    // need to fix the type definition of View interface and remove 'as string' assertion
                    name: name as string,
                    tag: options.tag === undefined ? 'div' : options.tag,
                    group: groupViewNames,
                    props: options.props?.('text', { props: {}, context: {} }) || null,
                    usage: hasMainDemo ? [mainDemoAsExample, ...usage.examples] : usage.examples
                });
            }
        }

        return this.#metadataCache = result;
    }

    resetViewRenderInfo() {
        // re-create maps since WeakMap keys are not enumerable and cannot be cleared
        this.viewEls = new WeakMap();
        this.rootViewEls = new WeakMap();
        this.fragmentEls = new WeakMap();
        this.tooltipEls = new WeakMap();
        this.configTransitions = new WeakMap();
        this.propsTransitions = new WeakMap();
    }
}
