/* eslint-env browser */

import Dict from './dict.js';
import type { Widget } from '../main/widget.js';
import { Preset } from './preset.js';

type RenderFunction = (el: HTMLElement | DocumentFragment, config: RenderProps, data?: any, context?: any) => Promise<any> | void;
type ViewRenderFunction = (el: HTMLElement | DocumentFragment, config: RawViewConfig, data?: any, context?: any) => Promise<any> | void;
type DefineViewConfig = ViewRenderFunction | RawViewConfig;
type RawViewConfig = SingleViewConfig | string | RawViewConfig[];
type NormalizedViewConfig = Record<string, any>;
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

interface ViewOptions {
    tag?: string | false | null;
}
interface View {
    name: string | false;
    options: ViewOptions;
    render: RenderFunction;
}
interface SingleViewConfig {
    view: string | RenderFunction;
    when?: query;
    data?: query;
    whenData?: query;
    className?: string | ClassNameFn | (string | ClassNameFn)[];
    tooltip?: TooltipConfig | RawViewConfig;
    [key: string]: any;
}
type RenderPropsForbiddenKeys = 'view' | 'when' | 'data' | 'whenData' | 'postRender' | 'className' | 'tooltip';
type RenderProps = {
    [K in string]: K extends RenderPropsForbiddenKeys ? never : any
}
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

type TooltipConfig = {
    showDelay?: boolean | number;
    className?: any;
    position?: 'pointer' | 'trigger';
    positionMode?: 'safe' | 'natural';
    pointerOffsetX?: number;
    pointerOffsetY?: number;
    content?: RawViewConfig;
}
type TooltipInfo = {
    config: TooltipConfig | TooltipConfig['content'];
    data: any;
    context: any;
}

const STUB_OBJECT = Object.freeze({});
const tooltipEls = new WeakMap<HTMLElement, TooltipInfo>();
const rootViewEls = new WeakMap<HTMLElement, RootViewInfo>();
const configTransitions = new WeakMap<object, any>();
const configOnlyProps = new Set([
    'view',
    'when',
    'data',
    'whenData',
    'postRender',
    'className',
    'tooltip'
]);

function isDocumentFragment(value: HTMLElement | DocumentFragment): value is DocumentFragment {
    return value.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

function regConfigTransition<T extends object>(res: T, from: any): T {
    configTransitions.set(res, from);
    return res;
}

function collectViewTree(viewRenderer: ViewRenderer, node: Node, parent: ViewTreeNode, ignoreNodes) {
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
        options: STUB_OBJECT,
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
    config,
    queryData,
    context,
    inputData,
    inputDataIndex,
    placeholder
) {
    if (!Object.hasOwn(config, type) || config[type] === undefined) {
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

function computeClassName(host: Widget, className: any, data: any, context: any): string[] | null {
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

function renderDom(
    viewRenderer: ViewRenderer,
    renderer: View,
    placeholder: Comment,
    config: NormalizedViewConfig,
    props,
    data?: any,
    context?: any,
    inputData?: any,
    inputDataIndex?: number
) {
    const { tag } = renderer.options;
    const el = tag === false || tag === null
        ? document.createDocumentFragment()
        : document.createElement(tag || 'div');
    let pipeline = Promise.resolve(renderer.render(el, props, data, context));

    if (typeof config.postRender === 'function') {
        pipeline = pipeline.then(() => config.postRender(el, config, data, context));
    }

    return pipeline
        .then(function() {
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

                if (props.tooltip) {
                    attachTooltip(viewRenderer.host, el, props.tooltip, data, context);
                }
            } else {
                for (let child of el.childNodes) {
                    const viewInfos = viewRenderer.fragmentEls.get(child);

                    if (viewInfos !== undefined) {
                        viewInfos.unshift(info);
                    } else {
                        viewRenderer.fragmentEls.set(child, [info]);
                    }
                }
            }

            placeholder.replaceWith(el);
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
        tooltip(el, config, data, context) {
            if (el && el.nodeType === 1) {
                attachTooltip(viewRenderer.host, el, config, data, context);
            } else {
                viewRenderer.host.log('warn', 'A tooltip can be attached to a HTML element only');
            }
        }
    };
}

function attachTooltip(host: Widget, el: HTMLElement, config: TooltipConfig | RawViewConfig, data: any, context: any) {
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
function createTooltip(host: Widget) {
    let classNames: string[] | null = null;
    const popup = new host.view.Popup({
        className: 'discovery-buildin-view-tooltip',
        hoverTriggers: '.discovery-view-has-tooltip',
        position: 'pointer',
        showDelay(triggerEl: HTMLElement) {
            let { config } = tooltipEls.get(triggerEl) || {};

            if (isPopupConfig(config)) {
                return config.showDelay;
            }
        },
        render(el: HTMLElement, triggerEl: HTMLElement) {
            let { config, data, context } = tooltipEls.get(triggerEl) || {};
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

function render(viewRenderer: ViewRenderer, container, config, inputData, inputDataIndex, context) {
    if (Array.isArray(config)) {
        return Promise.all(config.map(config =>
            render(viewRenderer, container, config, inputData, inputDataIndex, context)
        ));
    }

    const queryData = inputData && typeof inputDataIndex === 'number'
        ? inputData[inputDataIndex]
        : inputData;
    let renderer: View | null = null;

    switch (typeof config.view) {
        case 'function':
            renderer = {
                name: false,
                options: STUB_OBJECT,
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
                    options: { tag: false },
                    render: (el, _, _data) => {
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
                    options: { tag: false },
                    render: viewRenderer.host.preset.isDefined(presetName)
                        ? (viewRenderer.host.preset.get(presetName) as Preset).render
                        : () => {}
                };
            } else {
                renderer = viewRenderer.get(config.view) || null;
            }
            break;
    }

    if (!renderer) {
        const errorMsg = typeof config.view === 'string'
            ? 'View `' + config.view + '` is not found'
            : 'Render is not a function';

        viewRenderer.host.log('error', errorMsg, config);

        renderer = viewRenderer.defaultRenderErrorRenderer;
        config = { type: 'config', reason: errorMsg, config };
    }

    if (!container) {
        container = document.createDocumentFragment();
    }

    const placeholder = container.appendChild(document.createComment(''));

    if (condition('when', viewRenderer, config, queryData, context, inputData, inputDataIndex, placeholder)) {
        // immediately append a view insert point (a placeholder)
        const getData = 'data' in config
            ? Promise.resolve().then(() => viewRenderer.host.query(config.data, queryData, context))
            : Promise.resolve(queryData);

        // resolve data and render a view when ready
        return getData
            .then(outputData =>
                condition('whenData', viewRenderer, config, outputData, context, inputData, inputDataIndex, placeholder)
                    ? renderDom(
                        viewRenderer,
                        renderer,
                        placeholder,
                        config,
                        viewRenderer.propsFromConfig(config, outputData, context),
                        outputData,
                        context,
                        inputData,
                        inputDataIndex
                    )
                    : null // placeholder.remove()
            )
            .catch(e => {
                renderDom(viewRenderer, viewRenderer.defaultRenderErrorRenderer, placeholder, STUB_OBJECT, {
                    type: 'render',
                    reason: String(e),
                    config
                });
                viewRenderer.host.log('error', 'View render error:', e);
            });
    }

    return Promise.resolve();
}

export default class ViewRenderer extends Dict<View> {
    host: Widget;
    defaultRenderErrorRenderer: View;
    viewEls: WeakMap<Node, ViewInfo>;
    fragmentEls: WeakMap<Node, ViewInfo[]>;
    tooltip: ReturnType<typeof createTooltip> | null;
    Popup = class { // FIXME: that a stub for a Popup, use view/Popup instead
        position: TooltipConfig['position'];
        positionMode: TooltipConfig['positionMode'];
        pointerOffsetX: TooltipConfig['pointerOffsetX'];
        pointerOffsetY: TooltipConfig['pointerOffsetY'];
        constructor(config: any) {}
    };

    constructor(host: Widget) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView(this);
        this.viewEls = new WeakMap();
        this.fragmentEls = new WeakMap();
    }

    define(name: string, render: DefineViewConfig, options?: ViewOptions) {
        return ViewRenderer.define<View>(this, name, Object.freeze({
            name,
            options: Object.freeze({ ...options }),
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

    ensureValidConfig(config: any): RawViewConfig {
        if (Array.isArray(config)) {
            return config.map(item => this.ensureValidConfig(item));
        }

        if (!config || !config.view) {
            return this.badConfig(config, new Error(!config ? 'Config is not a valid value' : 'Option `view` is missed'));
        }

        return config;
    }

    composeConfig(config: any, extension: any): SingleViewConfig | SingleViewConfig[] {
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

    propsFromConfig(config: NormalizedViewConfig, data: any, context: any) {
        const props = regConfigTransition({}, config);

        for (const [key, value] of Object.entries(config)) {
            // Config only props are not available for view's render
            if (!configOnlyProps.has(key)) {
                props[key] = typeof value === 'string' && value.startsWith('=')
                    ? this.host.query(value.slice(1), data, context)
                    : value;
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

    listLimit(value, defaultValue) {
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
}
