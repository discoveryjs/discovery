import type { Model } from '../main/model.js';
import { hasOwn } from './utils/object-utils.js';
import { Dictionary } from './dict.js';
import { queryToConfig } from './utils/query-to-config.js';

export type RenderContext = ReturnType<typeof createRenderContext>;
type RenderFunction = (node: RenderList, props: RenderProps, data?: any, context?: any) => Promise<any> | void;
type NormalizedViewPropsFunction = (data: any, context: { props: RenderProps, context: any }) => any;
type DefineViewRender = RenderFunction | RawViewConfig;
type ViewUsage = any; // TODO: define a type
export type RawViewConfig = SingleViewConfig | RenderFunction | string | RawViewConfig[];
export type NormalizedViewConfig = SingleViewConfig | SingleViewConfig[];
type queryFn = (data: any, context: any) => any;
type query = string | queryFn | boolean;

type ConfigTransitionTreeNode = {
    value: any;
    deps: ConfigTransitionTreeNode[];
}

export interface ViewOptions {
    render: DefineViewRender;
    usage: ViewUsage;
    props: NormalizedViewPropsFunction | string;
}
export type ViewOptionsWithoutRender = Exclude<ViewOptions, 'render'>;
export interface NormalizedViewOptions {
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
    [key: string]: any;
}
type RenderPropsForbiddenKeys = 'view' | 'when' | 'context' | 'data' | 'whenData' | 'postRender';
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

const STUB_VIEW_OPTIONS: NormalizedViewOptions = Object.freeze({});
const STUB_CONFIG: SingleViewConfig = Object.freeze({ view: '' });
const configTransitions = new WeakMap<object, any>();
const propsTransitions = new WeakMap<object, PropsTransition>();
const configOnlyProps = new Set<RenderPropsForbiddenKeys>([
    'view',
    'when',
    'context',
    'data',
    'whenData',
    'postRender'
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

function createDefaultRenderErrorView(): View {
    return {
        name: 'config-error',
        options: STUB_VIEW_OPTIONS,
        render(node: RenderList, config: ErrorData) {
            node.appendText(`[Error: ${config.reason}]`);

            if ('config' in config) {
                // TODO: append config to node
            }
        }
    };
}

function condition(
    type: 'when' | 'whenData',
    viewRenderer: TextViewRenderer,
    config: SingleViewConfig,
    queryData: any,
    context: any,
    inputData: any,
    inputDataIndex: number | undefined,
    placeholder: RenderPlaceholder
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

type RenderNode = RenderList | RenderText | RenderPlaceholder;

class RenderList {
    children: RenderNode[];
    constructor(nodes?: RenderNode[]) {
        this.children = [];

        if (Array.isArray(nodes)) {
            for (const node of nodes) {
                this.append(node);
            }
        }
    }
    appendText(value: string) {
        this.append(new RenderText(value));
    }
    append(node: RenderNode) {
        this.children.push(node);
        return this;
    }
}

class RenderText {
    readonly value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class RenderPlaceholder {
    node: RenderNode | null;
    constructor() {
        this.node = null;
    }
    setNode(node: RenderNode) {
        this.node = node;
    }
}

async function renderNode(
    viewRenderer: TextViewRenderer,
    renderer: View,
    placeholder: RenderPlaceholder,
    config: SingleViewConfig,
    props: RenderProps,
    data?: any,
    context?: any,
    inputData?: any,
    inputDataIndex?: number
) {
    const node = new RenderList();

    await renderer.render(node, props, data, context);

    if (typeof config.postRender === 'function') {
        await config.postRender(node, config, data, context);
    }

    const info: ViewInfo = {
        config,
        props,
        inputData,
        inputDataIndex,
        data,
        context
    };

    viewRenderer.viewEls.set(node, info);
    placeholder.setNode(node);

    return placeholder;
}

function renderError(viewRenderer: TextViewRenderer, reason: string, placeholder: RenderPlaceholder, config: any) {
    return renderNode(viewRenderer, viewRenderer.defaultRenderErrorRenderer, placeholder, STUB_CONFIG, {
        type: 'render',
        reason,
        config
    });
}

function createRenderContext(viewRenderer: TextViewRenderer, name: string) {
    return {
        name,
        normalizeConfig: viewRenderer.normalizeConfig.bind(viewRenderer),
        ensureValidConfig: viewRenderer.ensureValidConfig.bind(viewRenderer),
        composeConfig: viewRenderer.composeConfig.bind(viewRenderer),
        propsFromConfig: viewRenderer.propsFromConfig.bind(viewRenderer),
        render: viewRenderer.render.bind(viewRenderer),
        listLimit: viewRenderer.listLimit.bind(viewRenderer),
        renderList: viewRenderer.renderList.bind(viewRenderer)
    };
}

async function render(
    viewRenderer: TextViewRenderer,
    container: RenderList,
    config: NormalizedViewConfig,
    inputData: any,
    inputDataIndex: number | undefined,
    context: any
): Promise<RenderNode> {
    if (Array.isArray(config)) {
        return Promise.all(config.map(config =>
            render(viewRenderer, container, config, inputData, inputDataIndex, context)
        )).then(nodes => new RenderList(nodes));
        // return;
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
            renderer = viewRenderer.get(config.view) || null;
            break;
    }

    if (!container) {
        container = new RenderList();
    }

    // immediately append a view insert point (a placeholder)
    const placeholder = new RenderPlaceholder();
    container.append(placeholder);

    if (!renderer) {
        const errorMsg = typeof config.view === 'string'
            ? 'View `' + config.view + '` is not found'
            : 'Render is not a function';

        viewRenderer.host.logger.error(errorMsg, config);
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
                // use await to catch possible errors in renderNode()
                return await renderNode(
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

        return placeholder;
    } catch (e) {
        viewRenderer.host.logger.error('View render error:', e.message);
        return renderError(viewRenderer, String(e), placeholder, STUB_CONFIG);
    }
}

export class TextViewRenderer extends Dictionary<View> {
    host: Model;
    defaultRenderErrorRenderer: View;
    viewEls: WeakMap<RenderNode, ViewInfo>;

    constructor(host: Model) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView();
        this.viewEls = new WeakMap();
    }

    define(name: string, render: DefineViewRender, options?: ViewOptionsWithoutRender): Readonly<View>;
    define(name: string, options: ViewOptions): Readonly<View>;
    define(name: string, _render: DefineViewRender | ViewOptions, _options?: ViewOptions) {
        const options: Partial<ViewOptions> = isRawViewConfig(_render) || typeof _render === 'function'
            ? { ..._options, render: _render }
            : _render;
        const { render = [], ...optionsWithoutRender } = options;
        const { props } = optionsWithoutRender;

        return TextViewRenderer.define<View>(this, name, Object.freeze({
            name,
            options: Object.freeze({
                ...options,
                props: typeof props === 'string'
                    ? this.host.queryFn(props)
                    : props
            }),
            render: typeof render === 'function'
                ? render.bind(createRenderContext(this, name))
                : (node, _, data, context) => this.render(node, render, data, context)
        } satisfies View));
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
                        return regConfigTransition(
                            queryToConfig(prefix, op + query) as SingleViewConfig, // FIXME
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

    textWidth(node: RenderNode | null) {
        if (node === null) {
            return 0;
        }

        if (node instanceof RenderList) {
            let res = 0;

            for (const child of node.children) {
                res += this.textWidth(child);
            }

            return res;
        } else {
            if (node instanceof RenderPlaceholder) {
                return this.textWidth(node.node);
            } else {
                return node.value.length;
            }
        }
    }

    serialize(node: RenderNode | null) {
        if (node === null) {
            return '';
        }

        if (node instanceof RenderList) {
            let buffer = '';

            for (const child of node.children) {
                const text = this.serialize(child);

                if (text !== '') {
                    buffer += this.serialize(child);
                }
            }

            return buffer;
        } else {
            if (node instanceof RenderPlaceholder) {
                return this.serialize(node.node);
            } else {
                return node.value;
            }
        }
    }

    serializeDom(node: RenderNode | null) {
        if (node === null) {
            return document.createDocumentFragment();
        }

        if (node instanceof RenderList) {
            const buffer = document.createElement('span');
            buffer.className = 'render-node';

            for (const child of node.children) {
                buffer.append(this.serializeDom(child));
            }

            return buffer;
        } else {
            if (node instanceof RenderPlaceholder) {
                return this.serializeDom(node.node);
            } else {
                const buffer = document.createElement('span');
                buffer.className = 'render-text';
                buffer.textContent = String(node.value);
                return buffer;
            }
        }
    }

    async render(
        container: RenderList | null,
        config: RawViewConfig,
        data?: any,
        context?: any,
        dataIndex?: number
    ) {
        if (!container) {
            container = new RenderList();
        }

        await render(
            this,
            container,
            this.ensureValidConfig(this.normalizeConfig(config)),
            data,
            dataIndex,
            context
        );

        return container;
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
        container: RenderList,
        itemConfig: RawViewConfig,
        data: any[],
        context: any,
        opts: Partial<{
            offset: number,
            limit: number | false,
            beforeMore: string,
            afterMore: string,
            moreContainer: RenderList,
            beforeItem: string,
            afterItem: string
        }>) {
        const { offset = 0, moreContainer, beforeItem, afterItem, beforeMore = beforeItem, afterMore = afterItem } = opts;
        let { limit = false } = opts;

        if (limit === false) {
            limit = data.length;
        }

        const result = Promise.all(
            data
                .slice(offset, offset + limit)
                .map((_, sliceIndex, slice) => {
                    beforeItem && container.appendText(beforeItem);
                    const render = this.render(container, itemConfig, data, {
                        ...context,
                        index: offset + sliceIndex,
                        array: data,
                        sliceIndex,
                        slice
                    }, offset + sliceIndex);
                    afterItem && container.appendText(afterItem);
                    return render;
                })
        );

        this.maybeMore(
            moreContainer || container,
            null,
            data.length,
            offset + limit,
            beforeMore,
            afterMore
        );

        return result;
    }

    maybeMore(
        container: RenderList,
        beforeEl: RenderList | null,
        count: number,
        offset: number,
        beforeMore?: string,
        afterMore?: string
    ) {
        if (count > offset) {
            const restCount = count - offset;
            container.appendText((beforeMore || '') + '(' + restCount + ' more…)' + (afterMore || ''));
        }
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
