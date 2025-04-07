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

type BorderLR =
    | null
    | string
    | Parameters<typeof borderLR>
    | ((index: number, total: number) => string | undefined);
type BorderTB =
    | null
    | string
    | Parameters<typeof borderTB>
    | ((len: number, left: number, right: number) => string | undefined);

type Span = {
    length: number;
    node: null | RenderNode;
};

export interface TextViewOptions {
    type: RenderBlockType;
    render: DefineTextViewRender;
    usage: TextViewUsage;
    props: NormalizedTextViewPropsFunction | string;
}
export type TextViewOptionsWithoutRender = Exclude<TextViewOptions, 'render'>;
export interface NormalizedTextViewOptions {
    type: RenderBlockType | undefined;
    border?: null | string | [
        top?: BorderTB,
        left?: BorderLR,
        bottom?: BorderTB,
        right?: BorderLR
    ] | Partial<{
        top: BorderTB;
        left: BorderLR;
        right: BorderLR;
        bottom: BorderTB;
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

        this.border = typeof border === 'string'
            ? new Border(border, border, border, border)
            : Array.isArray(border)
                ? new Border(...border)
                : new Border(
                    border.top || null,
                    border.right || null,
                    border.bottom || null,
                    border.left || null
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

function maxLinesLength(lines: string[], start = 0, end = lines.length - 1) {
    let maxLength = lines[start].length;

    for (let i = start + 1; i <= end; i++) {
        maxLength = Math.max(maxLength, lines[i].length);
    }

    return maxLength;
}
function truncLine(line: string, maxLength: number) {
    return line.length > maxLength
        ? line.slice(0, maxLength)
        : line;
}
function borderLR(start: string, mid = start, end = mid, single = start) {
    return (idx: number, total: number) =>
        total === 1 ? single : idx === 0 ? start : idx + 1 === total ? end : mid;
}
function arrayToBorderLR(value: BorderLR) {
    if (Array.isArray(value)) {
        return borderLR(...value);
    }

    return value;
}
function borderTB(start: string, mid = start, end = mid) {
    return (m: number, l: number, r: number) =>
        `${start}${''.padStart(m + l + r - start.length - end.length, mid)}${end}`;
}
function arrayToBorderTB(value: BorderTB) {
    if (Array.isArray(value)) {
        return borderTB(...value);
    }

    return value;
}

class Border {
    top: BorderTB;
    left: BorderLR;
    right: BorderLR;
    bottom: BorderTB;

    constructor(
        top: BorderTB = null,
        right: BorderLR = null,
        bottom: BorderTB = top,
        left: BorderLR = right
    ) {
        this.top = top || null;
        this.left = left || null;
        this.right = right || null;
        this.bottom = bottom || null;
    }

    render(lines: string[], spans: Span[][], node: RenderNode) {
        const leftBorder = arrayToBorderLR(this.left);
        const rightBorder = arrayToBorderLR(this.right);
        const topBorder = arrayToBorderTB(this.top);
        const bottomBorder = arrayToBorderTB(this.bottom);

        const maxMidLength = maxLinesLength(lines);
        let maxLeftLength = 0;
        let maxRightLength = 0;

        if (leftBorder) {
            if (typeof leftBorder === 'function') {
                const prefixes = lines.map((_, idx) => String(leftBorder(idx, lines.length) ?? ''));

                maxLeftLength = maxLinesLength(prefixes);
                lines = lines.map((line, idx) => prefixes[idx].padEnd(maxLeftLength) + line);
            } else {
                // left border is non-empty string
                maxLeftLength = leftBorder.length;
                lines = lines.map(line => leftBorder + line);
            }

            if (maxLeftLength > 0) {
                for (let i = 0; i < lines.length; i++) {
                    spans[i].unshift({ length: maxLeftLength, node });
                }
            }
        }


        if (rightBorder) {
            if (typeof rightBorder === 'function') {
                const suffixes = lines.map((_, idx) => String(rightBorder(idx, lines.length) ?? ''));

                maxRightLength = maxLinesLength(suffixes);

                if (maxRightLength > 0) {
                    for (let i = 0; i < lines.length; i++) {
                        spans[i].push({ length: maxLeftLength + maxMidLength - lines[i].length + maxRightLength, node });
                    }

                    lines = lines.map((line, idx) => line.padEnd(maxLeftLength + maxMidLength) + suffixes[idx].padStart(maxRightLength));
                }
            } else {
                // right border is non-empty string
                maxRightLength = rightBorder.length;

                for (let i = 0; i < lines.length; i++) {
                    spans[i].push({ length: maxLeftLength + maxMidLength - lines[i].length + maxRightLength, node });
                }

                lines = lines.map(line => line.padEnd(maxLeftLength + maxMidLength) + rightBorder);
            }
        }

        if (topBorder || bottomBorder) {
            const maxBorderWidth = maxMidLength + maxLeftLength + maxRightLength;

            if (topBorder) {
                const topBorderString = typeof topBorder === 'function'
                    ? topBorder(maxMidLength, maxLeftLength, maxRightLength) || ''
                    : ''.padStart(maxBorderWidth, topBorder);

                if (topBorderString) {
                    lines.unshift(truncLine(topBorderString, maxBorderWidth));
                    spans.unshift([{ length: lines[0].length, node }]);
                }
            }

            if (bottomBorder) {
                const bottomBorderString = typeof bottomBorder === 'function'
                    ? bottomBorder(maxMidLength, maxLeftLength, maxRightLength) || ''
                    : ''.padStart(maxBorderWidth, bottomBorder);

                if (bottomBorderString) {
                    lines.push(truncLine(bottomBorderString, maxBorderWidth));
                    spans.push([{ length: lines[lines.length - 1].length, node }]);
                }
            }
        }

        return {
            spans,
            lines
        };
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

            const view = this.viewEls.get(node);
            const border = node.border;
            node = new RenderBox(node.type, children);
            node.border = border;

            if (view) {
                this.viewEls.set(node, view);
            }
        } else if (node.value === '') {
            return null;
        }

        return node;
    }

    serialize(root: RenderNode | null) {
        const cleanTreeRoot = this.cleanUpRenderTree(root);
        const ranges: { range: [number, number], view: ViewInfo | null }[] = [];
        let text = '';

        if (cleanTreeRoot !== null) {
            const { lines, spans } = innerSerialize(cleanTreeRoot, null);

            let rangeOffset = 0;
            for (const line of spans) {
                for (const span of line) {
                    if (span.length > 0) {
                        const end = rangeOffset + span.length;
                        ranges.push({
                            range: [rangeOffset, end],
                            view: (span.node && this.viewEls.get(span.node)) ?? null
                        });
                        rangeOffset = end;
                    }
                }
                rangeOffset++;
            }

            text = lines.join('\n');
        }

        return {
            text,
            ranges
        };

        function padLineIfNeeded(
            lines: string[],
            lineIdx: number,
            minLength: number,
            spans: Span[][],
            node: RenderNode
        ) {
            if (lineIdx < lines.length) {
                if (lines[lineIdx].length < minLength) {
                    const prevValue = lines[lineIdx];
                    const newValue = prevValue.padEnd(minLength);
                    const lineSpans = spans[lineIdx];
                    const lastSpan = lineSpans.at(-1);

                    lines[lineIdx] = newValue;

                    if (lastSpan) {
                        lastSpan.length += newValue.length - prevValue.length;
                    } else {
                        spans[lineIdx].push({ length: newValue.length, node });
                    }
                }
            }
        }

        function innerSerialize(node: RenderNode, parent: RenderNode | null): { spans: Span[][]; lines: string[]; } {
            if (node instanceof RenderText) {
                const lines = node.value.split(/\r\n?|\n/);
                return {
                    spans: lines.map(line => [{ length: line.length, node: parent }]),
                    lines
                };
            }

            const spans: Span[][] = [[]];
            const lines: string[] = [''];
            let currentLineIdx = 0;
            if (node instanceof RenderBox) {
                let prevType: RenderBlockType | 'none' = 'none';

                for (const child of node.children) {
                    const type: RenderBlockType = child instanceof RenderBox ? child.type : 'inline';
                    const { lines: childLines, spans: childSpans } = innerSerialize(child, node);

                    if (childLines.length > 0) {
                        switch (type) {
                            case 'block':
                                currentLineIdx = lines.length - 1;

                                if (lines[currentLineIdx] !== '') {
                                    spans.push([]);
                                    lines.push('');
                                } else if (currentLineIdx > 0 && lines[currentLineIdx] !== '') {
                                    spans.push([]);
                                    lines.push('');
                                } else if (currentLineIdx === 0) {
                                    spans.pop();
                                    lines.pop();
                                }

                                spans.push(...childSpans);
                                lines.push(...childLines);
                                spans.push([]);
                                currentLineIdx = lines.push('') - 1;
                                break;

                            case 'line':
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                    spans.push([]);
                                } else if (lines[currentLineIdx] === '') {
                                    spans.pop();
                                    lines.pop();
                                }

                                spans.push(...childSpans);
                                lines.push(...childLines);
                                spans.push([]);
                                currentLineIdx = lines.push('') - 1;
                                break;

                            case 'inline-block': {
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                    spans.push([]);
                                } else if (prevType === 'inline' || prevType === 'inline-block') {
                                    padLineIfNeeded(
                                        lines,
                                        currentLineIdx,
                                        maxLinesLength(lines, currentLineIdx) + 1,
                                        spans,
                                        node
                                    );
                                }

                                const pad = lines[currentLineIdx].length;

                                spans[currentLineIdx].push(...childSpans[0]);
                                lines[currentLineIdx] += childLines[0];

                                if (childLines.length > 1) {
                                    const extraLines = childLines.length - (lines.length - currentLineIdx);

                                    for (let i = 0; i < extraLines; i++) {
                                        spans.push([]);
                                        lines.push('');
                                    }

                                    for (let i = 1; i < childLines.length; i++) {
                                        padLineIfNeeded(lines, currentLineIdx + i, pad, spans, node);
                                        spans[currentLineIdx + i].push(...childSpans[i]);
                                        lines[currentLineIdx + i] += childLines[i];
                                    }
                                }
                                break;
                            }

                            case 'inline':
                                if (prevType === 'block') {
                                    currentLineIdx = lines.push('') - 1;
                                    spans.push([]);
                                } else if (prevType === 'inline-block') {
                                    padLineIfNeeded(
                                        lines,
                                        currentLineIdx,
                                        maxLinesLength(lines, currentLineIdx) + 1,
                                        spans,
                                        node
                                    );
                                }

                                spans[currentLineIdx].push(...childSpans[0]);
                                lines[currentLineIdx] += childLines[0];

                                if (childLines.length > 1) {
                                    for (let i = 1; i < childLines.length; i++) {
                                        currentLineIdx = lines.push(childLines[i]) - 1;
                                        spans[currentLineIdx] = childSpans[i];
                                    }
                                }
                                break;
                        }

                        prevType = type;
                    }
                }

                while (lines[currentLineIdx] === '') {
                    currentLineIdx--;
                    spans.pop();
                    lines.pop();
                }

                if (node.border) {
                    return node.border.render(lines, spans, node);
                }
            }

            return { spans, lines };
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
