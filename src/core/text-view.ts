import type { Model } from '../main/model.js';
import { hasOwn } from './utils/object-utils.js';
import { Dictionary } from './dict.js';
import { queryToConfig } from './utils/query-to-config.js';

export type RenderContext = ReturnType<typeof createRenderContext>;
type TextRenderFunction = (node: RenderBox, props: RenderProps, data?: any, context?: any) => Promise<any> | void;
type NormalizedTextViewPropsFunction = (data: any, context: { props: RenderProps, context: any }) => any;
type DefineTextViewRender = TextRenderFunction | RawTextViewConfig;
type TextViewUsage = any; // TODO: define a type
export type RawTextViewConfig = SingleTextViewConfig | TextRenderFunction | string | RawTextViewConfig[];
export type NormalizedTextViewConfig = SingleTextViewConfig | SingleTextViewConfig[];
type queryFn = (data: any, context: any) => any;
type query = string | queryFn | boolean;

type ConfigTransitionTreeNode = {
    value: any;
    deps: ConfigTransitionTreeNode[];
}

type lrBorder = null | string | ((index: number, total: number) => string | undefined);
type tbBorder = null | string | ((len: number, left: number, right: number) => string | undefined);

export interface TextViewOptions {
    type: RenderBlockType;
    render: DefineTextViewRender;
    usage: TextViewUsage;
    props: NormalizedTextViewPropsFunction | string;
}
export type TextViewOptionsWithoutRender = Exclude<TextViewOptions, 'render'>;
export interface NormalizedTextViewOptions {
    type: RenderBlockType | undefined;
    border?: null | Partial<{
        top: tbBorder;
        left: lrBorder;
        right: lrBorder;
        bottom: tbBorder;
    }>;
    usage?: TextViewUsage;
    props?: NormalizedTextViewPropsFunction;
}

interface TextView {
    name: string | false;
    options: NormalizedTextViewOptions;
    render: TextRenderFunction;
}
export interface SingleTextViewConfig {
    view: string | TextRenderFunction;
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
    fn: NormalizedTextViewPropsFunction & { query?: string };
};

interface ViewInfo {
    config: NormalizedTextViewConfig;
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

const STUB_VIEW_OPTIONS: NormalizedTextViewOptions = Object.freeze({ type: undefined });
const STUB_CONFIG: SingleTextViewConfig = Object.freeze({ view: '' });
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

export function isRawViewConfig(value: unknown): value is RawTextViewConfig {
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

function createDefaultRenderErrorView(): TextView {
    return {
        name: 'config-error',
        options: STUB_VIEW_OPTIONS,
        render(node: RenderBox, config: ErrorData) {
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
    config: SingleTextViewConfig,
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

type RenderNode = RenderBox | RenderText | RenderPlaceholder;
type RenderBlockType = 'inline' | 'inline-block' | 'block' | 'line';

class RenderBox {
    type: RenderBlockType;
    children: RenderNode[];
    border: Border | null;

    constructor(type: RenderBlockType = 'inline', nodes?: RenderNode[]) {
        this.type = type;
        this.children = [];
        this.border = null;

        if (Array.isArray(nodes)) {
            for (const node of nodes) {
                this.append(node);
            }
        }
    }
    appendText(value: string) {
        this.append(new RenderText(value));
    }
    appendInlineBlock() {
        const node = new RenderBox('inline-block');
        this.append(node);
        return node;
    }
    appendBlock() {
        const node = new RenderBox('block');
        this.append(node);
        return node;
    }
    appendLine() {
        const node = new RenderBox('line');
        this.append(node);
        return node;
    }
    append(node: RenderNode) {
        this.children.push(node);
        return this;
    }
    setBorder(border?: NormalizedTextViewOptions['border']) {
        if (!border) {
            this.border = null;
            return;
        }

        this.border = new Border(
            border.top || null,
            border.left || null,
            border.right || null,
            border.bottom || null
        );
    }
}

class RenderText {
    readonly value: string;
    constructor(value: string) {
        this.value = String(value);
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

function maxLineLength(lines: string[]) {
    return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

class Border {
    top: tbBorder;
    left: lrBorder;
    right: lrBorder;
    bottom: tbBorder;

    constructor(top: tbBorder, left: lrBorder, right: lrBorder, bottom: tbBorder) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }

    render(lines: string[]) {
        const maxMidLength = maxLineLength(lines);
        const leftBorder = this.left;
        let maxLeftLength = 0;

        if (leftBorder) {
            if (typeof leftBorder === 'function') {
                const prefixes = lines.map((_, idx) => String(leftBorder(idx, lines.length) ?? ''));

                maxLeftLength = maxLineLength(prefixes);
                lines = lines.map((line, idx) => prefixes[idx].padEnd(maxLeftLength) + line);
            } else {
                maxLeftLength = leftBorder.length;
                lines = lines.map(line => leftBorder + line);
            }
        }

        const rightBorder = this.right;
        let maxRightLength = 0;

        if (rightBorder) {
            if (typeof rightBorder === 'function') {
                const suffixes = lines.map((_, idx) => String(rightBorder(idx, lines.length) ?? ''));

                maxRightLength = maxLineLength(suffixes);
                lines = lines.map((line, idx) => line.padEnd(maxLeftLength + maxMidLength) + suffixes[idx].padStart(maxRightLength));
            } else {
                maxRightLength = rightBorder.length;
                lines = lines.map(line => line.padEnd(maxLeftLength + maxMidLength) + rightBorder);
            }
        }

        const topBorder = this.top;
        const bottomBorder = this.bottom;
        if (topBorder || bottomBorder) {

            if (topBorder) {
                const topBorderString = typeof topBorder === 'function'
                    ? topBorder(maxMidLength, maxLeftLength, maxRightLength) || ''
                    : ''.padStart(maxMidLength + maxLeftLength + maxRightLength, topBorder);

                if (topBorderString) {
                    lines.unshift(topBorderString);
                }
            }

            if (bottomBorder) {
                const bottomBorderString = typeof bottomBorder === 'function'
                    ? bottomBorder(maxMidLength, maxLeftLength, maxRightLength) || ''
                    : ''.padStart(maxMidLength + maxLeftLength + maxRightLength, bottomBorder);

                if (bottomBorderString) {
                    lines.push(bottomBorderString);
                }
            }
        }

        return lines;
    }
}

async function renderNode(
    viewRenderer: TextViewRenderer,
    renderer: TextView,
    placeholder: RenderPlaceholder,
    config: SingleTextViewConfig,
    props: RenderProps,
    data?: any,
    context?: any,
    inputData?: any,
    inputDataIndex?: number
) {
    const node = new RenderBox(renderer.options.type || 'inline');

    if (renderer.options.border) {
        node.setBorder(renderer.options.border);
    }

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
    container: RenderBox,
    config: NormalizedTextViewConfig,
    inputData: any,
    inputDataIndex: number | undefined,
    context: any
): Promise<RenderNode> {
    if (Array.isArray(config)) {
        return Promise.all(config.map(config =>
            render(viewRenderer, container, config, inputData, inputDataIndex, context)
        )).then(nodes => new RenderBox('inline', nodes));
        // return;
    }

    const queryData = inputData && typeof inputDataIndex === 'number'
        ? inputData[inputDataIndex]
        : inputData;
    let renderer: TextView | null = null;

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
        container = new RenderBox();
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

export class TextViewRenderer extends Dictionary<TextView> {
    host: Model;
    defaultRenderErrorRenderer: TextView;
    viewEls: WeakMap<RenderNode, ViewInfo>;

    constructor(host: Model) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView();
        this.viewEls = new WeakMap();
    }

    define(name: string, render: DefineTextViewRender, options?: TextViewOptionsWithoutRender): Readonly<TextView>;
    define(name: string, options: TextViewOptions): Readonly<TextView>;
    define(name: string, _render: DefineTextViewRender | TextViewOptions, _options?: TextViewOptions) {
        const options: Partial<TextViewOptions> = isRawViewConfig(_render) || typeof _render === 'function'
            ? { ..._options, render: _render }
            : _render;
        const { render = [], ...optionsWithoutRender } = options;
        const { type, props } = optionsWithoutRender;

        return TextViewRenderer.define<TextView>(this, name, Object.freeze({
            name,
            options: Object.freeze({
                ...options,
                type: typeof type === 'string' || type === undefined ? type : undefined,
                props: typeof props === 'string'
                    ? this.host.queryFn(props)
                    : props
            }),
            render: typeof render === 'function'
                ? render.bind(createRenderContext(this, name))
                : (node, _, data, context) => this.render(node, render, data, context)
        } satisfies TextView));
    }

    normalizeConfig(config: RawTextViewConfig | TextRenderFunction): SingleTextViewConfig | SingleTextViewConfig[] | null {
        if (!config) {
            return null;
        }

        if (Array.isArray(config)) {
            const arrayOfConfigs: SingleTextViewConfig[] = [];

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
                            queryToConfig(prefix, op + query) as SingleTextViewConfig, // FIXME
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

    badConfig(config: any, error: Error): SingleTextViewConfig {
        const errorMsg = error?.message || 'Unknown error';

        this.host.logger.error(errorMsg, { config, error });

        return {
            view: this.defaultRenderErrorRenderer.render,
            type: 'config',
            reason: errorMsg,
            config
        };
    }

    ensureValidConfig(config: any): NormalizedTextViewConfig {
        if (Array.isArray(config)) {
            return config.map(item => this.ensureValidConfig(item)).flat();
        }

        if (!config || !config.view) {
            return this.badConfig(config, new Error(!config ? 'Config is not a valid value' : 'Option `view` is missed'));
        }

        return config;
    }

    composeConfig(config: any, extension: any): NormalizedTextViewConfig {
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
        config: SingleTextViewConfig,
        data: any,
        context: any,
        fn: NormalizedTextViewPropsFunction | null | false | undefined = this.get(config?.view as string)?.options.props
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

        if (node instanceof RenderBox) {
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

    cleanUpRenderTree(node: RenderNode | null) {
        if (node === null) {
            return null;
        }

        if (node instanceof RenderPlaceholder) {
            return this.cleanUpRenderTree(node.node);
        }

        if (node instanceof RenderBox) {
            const children = node.children
                .map(this.cleanUpRenderTree, this)
                .filter(node => node !== null);

            if (children.length === 0) {
                return null;
            }

            if (children.length === 1 && (node.type === 'inline' || (node.type === children[0].type && node.border === null))) {
                node = children[0];
            } else {
                const border = node.border;
                node = new RenderBox(node.type, children.length === 1 && children[0].type === 'inline' ? children[0].children : children);
                node.border = border;
            }
        } else if (node.value === '') {
            return null;
        }

        return node;
    }

    vline(s1: string, s2 = s1, s3 = s2, s4 = s1) {
        return (idx: number, total: number) =>
            total === 1 ? s4 : idx === 0 ? s1 : idx + 1 === total ? s3 : s2;
    }

    serialize(root: RenderNode | null) {
        const cleanTreeRoot = this.cleanUpRenderTree(root);
        const text = cleanTreeRoot === null
            ? ''
            : innerSerialize(cleanTreeRoot).join('\n');

        return {
            text
        };

        function innerSerialize(node: RenderNode): string[] {
            if (node instanceof RenderText) {
                return node.value.split(/\r\n?|\n/);
            }

            const lines: string[] = [''];
            let currentLineIdx = 0;
            if (node instanceof RenderBox) {
                let prevType: RenderBlockType = 'inline';

                for (const child of node.children) {
                    const type: RenderBlockType = child instanceof RenderBox ? child.type : 'inline';
                    const childLines = innerSerialize(child);

                    if (childLines.length > 0) {
                        switch (type) {
                            case 'block':
                                currentLineIdx = lines.length - 1;

                                if (lines[currentLineIdx] !== '') {
                                    lines.push('');
                                } else if (currentLineIdx > 0 && lines[currentLineIdx] !== '') {
                                    lines.push('');
                                } else if (currentLineIdx === 0) {
                                    lines.pop();
                                }

                                lines.push(...childLines);
                                currentLineIdx = lines.push('') - 1;
                                break;

                            case 'line':
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                } else if (lines[currentLineIdx] === '') {
                                    lines.pop();
                                }

                                lines.push(...childLines);
                                currentLineIdx = lines.push('') - 1;
                                break;

                            case 'inline-block': {
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                } else if (lines[currentLineIdx] !== '' && !/\s$/.test(lines[currentLineIdx])) {
                                    lines[currentLineIdx] += ' ';
                                }

                                const pad = lines[currentLineIdx].length;

                                lines[currentLineIdx] += childLines[0];

                                if (childLines.length > 1) {
                                    for (let i = 1; i < childLines.length; i++) {
                                        if (currentLineIdx + i < lines.length) {
                                            lines[currentLineIdx + i] = lines[currentLineIdx + i].padEnd(pad) + childLines[i];
                                        } else {
                                            lines.push(' '.repeat(pad) + childLines[i]);
                                        }
                                    }
                                }
                                break;
                            }

                            case 'inline':
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                } else if (prevType === 'inline-block') {
                                    lines[currentLineIdx] += ' ';
                                }

                                lines[currentLineIdx] += childLines[0];

                                if (childLines.length > 1) {
                                    for (let i = 1; i < childLines.length; i++) {
                                        currentLineIdx = lines.push(childLines[i]) - 1;
                                    }
                                }
                                break;
                        }

                        prevType = type;
                    }
                }

                while (lines[currentLineIdx] === '') {
                    currentLineIdx--;
                    lines.pop();
                }

                if (node.border) {
                    return node.border.render(lines);
                }
            }


            return lines;
        }
    }

    async render(
        container: RenderBox | RenderBlockType | null,
        config: RawTextViewConfig,
        data?: any,
        context?: any,
        dataIndex?: number
    ) {
        if (typeof container === 'string') {
            container = new RenderBox(container);
        } else if (!container) {
            container = new RenderBox();
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

    async renderString(
        container: RenderBox | null,
        config: RawTextViewConfig,
        data?: any,
        context?: any,
        dataIndex?: number
    ) {
        return this.serialize(await this.render(container, config, data, context, dataIndex));
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
        container: RenderBox,
        itemConfig: RawTextViewConfig,
        data: any[],
        context: any,
        opts: Partial<{
            offset: number,
            limit: number | false,
            beforeMore: string,
            afterMore: string,
            moreContainer: RenderBox,
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
        container: RenderBox,
        beforeEl: RenderBox | null,
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
