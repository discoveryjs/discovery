/* eslint-env browser */

import type { ViewModel } from '../main/view-model.js';
import type { PopupOptions, PopupRender } from '../views/layout/popup.js';
import { isDocumentFragment } from './utils/dom.js';
import { hasOwn } from './utils/object-utils.js';
import { Dictionary } from './dict.js';
import { Preset } from './preset.js';

export type RenderContext = ReturnType<typeof createRenderContext>;
type RenderFunction = (el: HTMLElement | DocumentFragment, props: RenderProps, data?: any, context?: any) => Promise<any> | void;
type ViewRenderFunction = (el: HTMLElement | DocumentFragment, props: RenderProps, data?: any, context?: any) => Promise<any> | void;
type NormalizedViewPropsFunction = (data: any, context: { props: RenderProps, context: any }) => any;
type DefineViewRender = ViewRenderFunction | RawViewConfig;
type ViewUsage = any; // TODO: define a type
export type RawViewConfig = SingleViewConfig | string | RawViewConfig[];
export type NormalizedViewConfig = SingleViewConfig | SingleViewConfig[];
type ClassNameFn = (data: any, context: any) => string | false | null | undefined;
type queryFn = (data: any, context: any) => any;
type query = string | queryFn | boolean;

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
export interface SingleViewConfig {
    view: string | RenderFunction;
    when?: query;
    context?: query;
    data?: query;
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
    config: NormalizedViewConfig;
    skipped?: 'when' | 'whenData';
    props?: any,
    inputData: any;
    inputDataIndex?: number;
    data: any;
    context: any;
};
interface ErrorData {
    type?: string;
    config: any;
    reason: string;
}

export type TooltipConfig = Partial<{
    showDelay: boolean | number;
    className: string;
    position: PopupOptions['position'];
    positionMode: PopupOptions['positionMode'];
    pointerOffsetX: number;
    pointerOffsetY: number;
    content: RawViewConfig;
}>;
type TooltipInfo = {
    config: TooltipConfig | TooltipConfig['content'];
    data: any;
    context: any;
};

const STUB_VIEW_OPTIONS: NormalizedViewOptions = Object.freeze({ tag: undefined });
const STUB_CONFIG: SingleViewConfig = Object.freeze({ view: '' });
const tooltipEls = new WeakMap<HTMLElement, TooltipInfo>();
const rootViewEls = new WeakMap<HTMLElement, RootViewInfo>();
const configTransitions = new WeakMap<object, any>();
const propsTransitions = new WeakMap<object, PropsTransition>();
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

function regConfigTransition<T extends object>(res: T, from: any): T {
    configTransitions.set(res, from);
    return res;
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
                    node: null,
                    parent,
                    view: info,
                    children: []
                });
            }
        }
    }

    const rootViewInfo = rootViewEls.get(node as any);

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

function createDefaultRenderErrorView(view: ViewRenderer): View {
    return {
        name: 'config-error',
        options: STUB_VIEW_OPTIONS,
        render(el: HTMLElement, config: ErrorData) {
            el.className = 'discovery-buildin-view-render-error';
            el.dataset.type = config.type;
            el.textContent = config.reason;

            if ('config' in config) {
                const configEl = el.appendChild(document.createElement('span'));

                configEl.className = 'toggle-config';
                configEl.textContent = 'show config...';
                configEl.addEventListener('click', () => {
                    if (el.classList.toggle('expanded')) {
                        configEl.textContent = 'hide config...';
                        view.render(el, { view: 'struct', expanded: 1 }, config.config);
                    } else {
                        configEl.textContent = 'show config...';
                        el.lastChild?.remove();
                    }
                });
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

function computeClassName(host: ViewModel, className: any, data: any, context: any): string[] | null {
    let classNames = className;

    if (typeof classNames === 'string' && classNames.startsWith('=')) {
        classNames = host.queryFn(classNames.slice(1));
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

        if (config.className) {
            const classNames = computeClassName(viewRenderer.host, config.className, data, context);

            if (classNames !== null) {
                el.classList.add(...classNames);
            }
        }

        if (config.tooltip) {
            attachTooltip(viewRenderer.host, el, config.tooltip, data, context);
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

function renderError(viewRenderer: ViewRenderer, reason: string, placeholder: Comment, config: any) {
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
        render: viewRenderer.render.bind(viewRenderer),
        listLimit: viewRenderer.listLimit.bind(viewRenderer),
        renderList: viewRenderer.renderList.bind(viewRenderer),
        maybeMoreButtons: viewRenderer.maybeMoreButtons.bind(viewRenderer),
        renderMoreButton: viewRenderer.renderMoreButton.bind(viewRenderer),
        tooltip(el: HTMLElement, config: RenderProps, data?: any, context?: any) {
            if (el && el.nodeType === 1) {
                attachTooltip(viewRenderer.host, el, config, data, context);
            } else {
                viewRenderer.host.log('warn', 'A tooltip can be attached to a HTML element only');
            }
        }
    };
}

function attachTooltip(host: ViewModel, el: HTMLElement, config: TooltipConfig | RawViewConfig, data: any, context: any) {
    el.classList.add('discovery-view-has-tooltip');
    tooltipEls.set(el, { config, data, context });

    if (host.view.tooltip === null) {
        host.view.tooltip = createTooltip(host);
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
function createTooltip(host: ViewModel) {
    let classNames: string[] | null = null;
    const popup = new host.view.Popup({
        className: 'discovery-buildin-view-tooltip',
        hoverTriggers: '.discovery-view-has-tooltip',
        position: 'pointer',
        showDelay(triggerEl: HTMLElement) {
            const { config } = tooltipEls.get(triggerEl) || {};

            return isPopupConfig(config)
                ? config.showDelay ?? true
                : true;
        },
        render(el: HTMLElement, triggerEl: HTMLElement) {
            const { config, data, context } = tooltipEls.get(triggerEl) || {};
            let position: TooltipConfig['position'] = 'pointer';
            let positionMode: TooltipConfig['positionMode'] = 'natural';
            let pointerOffsetX: TooltipConfig['pointerOffsetX'] = 3;
            let pointerOffsetY: TooltipConfig['pointerOffsetY'] = 3;
            let content: any = config;

            if (classNames !== null) {
                el.classList.remove(...classNames);
                classNames = null;
            }

            if (isPopupConfig(config)) {
                classNames = computeClassName(host, config.className, data, context);

                if (classNames !== null) {
                    el.classList.add(...classNames);
                }

                position = config.position || position;
                positionMode = config.positionMode || positionMode;
                pointerOffsetX = ensureNumber(config.pointerOffsetX, pointerOffsetX);
                pointerOffsetY = ensureNumber(config.pointerOffsetY, pointerOffsetY);

                content = config.content;
            }

            popup.position = position;
            popup.positionMode = positionMode;
            popup.pointerOffsetX = pointerOffsetX;
            popup.pointerOffsetY = pointerOffsetY;

            if (content) {
                return host.view.render(el, content, data, context);
            }

            return host.view.render(el, {
                view: host.view.defaultRenderErrorRenderer.render,
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
                } = config;

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
                const presetName = config.view.substr(7);

                renderer = {
                    name: false,
                    options: { tag: null },
                    render: viewRenderer.host.preset.isDefined(presetName)
                        ? (viewRenderer.host.preset.get(presetName) as Preset).render
                        : () => {}
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

        viewRenderer.host.log('error', errorMsg, config);
        return renderError(viewRenderer, errorMsg, placeholder, config);
    }

    try {
        // when -> data -> whenData -> render
        if (condition('when', viewRenderer, config, queryData, context, inputData, inputDataIndex, placeholder)) {
            const renderContext = 'context' in config
                ? await viewRenderer.host.query(config.context, queryData, context)
                : context;
            const renderData = 'data' in config
                ? await viewRenderer.host.query(config.data, queryData, renderContext)
                : queryData;

            if (condition('whenData', viewRenderer, config, renderData, renderContext, inputData, inputDataIndex, placeholder)) {
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
        viewRenderer.host.log('error', 'View render error:', e);
        return renderError(viewRenderer, String(e), placeholder, STUB_CONFIG);
    }
}

type PopupShowArgs = [triggerEl: HTMLElement, render?: PopupRender, showImmediately?: boolean];
export class ViewPopup { // FIXME: that a stub for a Popup, use view/Popup instead
    el: HTMLElement;
    position: TooltipConfig['position'];
    positionMode: TooltipConfig['positionMode'];
    pointerOffsetX: TooltipConfig['pointerOffsetX'];
    pointerOffsetY: TooltipConfig['pointerOffsetY'];
    // use method definition aside, since stub implementation doesn't use config parameter
    constructor(config: Partial<PopupOptions>);
    constructor() {}

    toggle(...args: PopupShowArgs): void;
    toggle() {}
    show(...args: PopupShowArgs): Promise<void>;
    async show() {}
    hide() {}
}

export class ViewRenderer extends Dictionary<View> {
    host: ViewModel;
    defaultRenderErrorRenderer: View;
    viewEls: WeakMap<Node, ViewInfo>;
    fragmentEls: WeakMap<Node, ViewInfo[]>;
    tooltip: ReturnType<typeof createTooltip> | null;
    Popup = ViewPopup;

    constructor(host: ViewModel) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView(this);
        this.viewEls = new WeakMap();
        this.fragmentEls = new WeakMap();
        this.tooltip = null;
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

    normalizeConfig(config: RawViewConfig): SingleViewConfig | SingleViewConfig[] | null {
        if (!config) {
            return null;
        }

        if (Array.isArray(config)) {
            return config.reduce(
                (res, item) => res.concat(this.normalizeConfig(item) || []),
                []
            );
        }

        if (typeof config === 'string') {
            const [, prefix, op, query] = config.match(/^(\S+?)([:{])((?:.|\s)+)$/) || [];

            if (prefix) {
                if (op === '{') {
                    try {
                        return regConfigTransition(
                            this.host.queryToConfig(prefix, op + query),
                            config
                        );
                    } catch (error) {
                        return regConfigTransition(
                            this.badConfig(config, error),
                            config
                        );
                    }
                }

                return regConfigTransition({
                    view: prefix,
                    data: query
                }, config);
            }

            return regConfigTransition({
                view: config
            }, config);
        } else if (typeof config === 'function') {
            return regConfigTransition({
                view: config
            }, config);
        }

        return config;
    }

    badConfig(config: any, error: Error): SingleViewConfig {
        const errorMsg = error?.message || 'Unknown error';

        this.host.log('error', errorMsg, { config, error });

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
                ? config.map(item => regConfigTransition({ ...item, ...extension }, [item, extension]))
                : regConfigTransition({ ...config, ...extension }, [config, extension]);
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
                propsTransitions.set(normProps, { props, fn });
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

    listLimit(value: any, defaultValue: number) {
        if (value === false) {
            return false;
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
        offset = 0,
        limit: number | false = false,
        moreContainer: HTMLElement) {
        if (limit === false) {
            limit = data.length;
        }

        const result = Promise.all(
            data
                .slice(offset, offset + limit)
                .map((_, sliceIndex, slice) =>
                    this.render(container, itemConfig, data, {
                        ...context,
                        index: offset + sliceIndex,
                        array: data,
                        sliceIndex,
                        slice
                    }, offset + sliceIndex)
                )
        );

        this.maybeMoreButtons(
            moreContainer || container,
            null,
            data.length,
            offset + limit,
            limit,
            (offset, limit) => this.renderList(container, itemConfig, data, context, offset, limit, moreContainer)
        );

        return result;
    }

    maybeMoreButtons(
        container: HTMLElement,
        beforeEl: Node | null,
        count: number,
        offset: number,
        limit: number,
        renderMore: (offset: number, limit: number) => any
    ) {
        if (count <= offset) {
            return null;
        }

        const restCount = count - offset;
        const buttons = document.createElement('span');

        if (restCount > limit) {
            this.renderMoreButton(
                buttons,
                'Show ' + limit + ' more...',
                () => renderMore(offset, limit)
            );
        }

        if (restCount > 0) {
            this.renderMoreButton(
                buttons,
                'Show all the rest ' + restCount + ' items...',
                () => renderMore(offset, Infinity)
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

    attachTooltip(el: HTMLElement, config: TooltipConfig | RawViewConfig, data: any, context: any) {
        attachTooltip(this.host, el, config, data, context);
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
        rootViewEls.set(node, {
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

    getViewStackTrace(el: Node) {
        const { container: root } = this.host.dom as { container?: HTMLElement | null };

        if (!root || el instanceof Node === false || !root.contains(el)) {
            return null;
        }

        const stack: ViewInfo[] = [];
        let cursor: Node | null = el;

        while (cursor !== null && cursor !== root) {
            const viewInfo = this.viewEls.get(cursor);

            if (viewInfo !== undefined) {
                stack.push(viewInfo);
            }

            cursor = cursor.parentNode;
        }

        if (stack.length === 0) {
            return null;
        }

        return stack.reverse();
    }

    getViewConfigTransitionTree(value: any): ConfigTransitionTreeNode {
        let deps = configTransitions.get(value) || [];

        if (!Array.isArray(deps)) {
            deps = [deps];
        }

        return {
            value,
            deps: deps.map(this.getViewConfigTransitionTree, this)
        };
    }

    getViewPropsTransition(value: any): null | PropsTransition & { query: string | null } {
        const transition = propsTransitions.get(value) || null;

        return transition && {
            props: transition.props,
            fn: transition.fn,
            query: transition.fn.query || null
        };
    }
}
