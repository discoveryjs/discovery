import type { TooltipConfig } from '../../core/view.js';
import type { ViewModel } from '../../main/view-model.js';
import type { QueryEditor } from '../../views/editor/editors.js';
import type { Computation, Graph, GraphNode, UpdateHostParams } from './types.js';
import { createElement } from '../../core/utils/dom.js';
import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { getBoundingRect } from '../../core/utils/layout.js';
import { contextWithoutEditorParams, getParamsFromContext } from './params.js';
import { Dataset } from '../../core/utils/load-data.types.js';
import { deepEqual } from '../../core/utils/compare.js';

type ViewDataset = {
    type: string;
    name: string;
};
type GraphNodePath = [graph: Graph, ...GraphNode[]];
type GraphMutator = (graphState: {
    nextGraph: Graph;
    currentPath: GraphNodePath;
    last: GraphNode;
    preLast: GraphNode;
}) => { query?: string; view?: string; graph: Graph; };
type GraphWalkNode = {
    parent: GraphWalkNode | null;
    children: GraphWalkNode[];
    node: GraphNode;
    nodeEl: HTMLElement;
    layerIndex: number;
    layerPos: number;
    layerOptPos: number;
};
type EditorErrorMarker = {
    clear(): void;
};

function count(value: unknown[], one: string, many: string): string {
    return value.length ? `${value.length} ${value.length === 1 ? one : many}` : 'empty';
}

function clamp(num: number, min: number, max: number) {
    return Math.min(max, Math.max(num, min));
}

function valueDescriptor(value: unknown) {
    if (Array.isArray(value)) {
        return `Array (${count(value, 'element', 'elements')})`;
    }

    if (value && typeof value === 'object') {
        return `Object (${count(Object.keys(value), 'entry', 'entries')})`;
    }

    return `Scalar (${value === null ? 'null' : typeof value})`;
}

function createNumDelimElement(value: unknown) {
    return createElement('span', 'num-delim-wrapper', numDelim(value));
}

function svg(tagName: string, attributes?: Record<string, unknown>) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    if (attributes) {
        for (const [k, v] of Object.entries(attributes)) {
            el.setAttribute(k, String(v));
        }
    }

    return el;
}

function syncDatasetsView(el: HTMLElement, datasets: Dataset[], prevSyncDatasets: ViewDataset[]) {
    if (!Array.isArray(datasets)) {
        datasets = [];
    }

    const nextSyncDatasets = datasets.map((dataset) => ({
        type: dataset.resource?.type || 'unknown',
        name: dataset.resource?.name || 'unknown'
    }));

    if (deepEqual(nextSyncDatasets, prevSyncDatasets)) {
        return prevSyncDatasets;
    }

    el.replaceChildren();

    for (const dataset of nextSyncDatasets) {
        el.appendChild(createElement('div', 'dataset', [
            createElement('span', 'dataset__type', dataset.type),
            createElement('span', 'dataset__name', dataset.name)
        ]));
    }

    return nextSyncDatasets;
}

function syncQueryGraphView(el: HTMLElement, graph: Graph, host: ViewModel, targetNode?: Partial<GraphNode>) {
    function createGraphLayer() {
        return el.appendChild(createElement('div', 'query-graph-layer'));
    }

    function createGraphNode() {
        return createElement('div', {
            class: 'query-graph-node',
            tabindex: -1,
            'data-action': 'select'
        }, [
            createElement('div', 'query-graph-node__dot'),
            createElement('div', 'query-graph-node__label')
        ]);
    }

    function updateGraphNodeEl(el: HTMLElement, path: number[], node: GraphNode) {
        const labelEl = el.lastElementChild as HTMLElement;
        const { label, text } = getNodeLabel(node);

        el.dataset.path = path.join(' ');
        labelEl.classList.toggle('has-label', label);
        labelEl.textContent = text;
    }

    function getNodeLabel(node: GraphNode) {
        if (node.label) {
            return { label: true, text: node.label };
        }

        const { query } = node;

        if (typeof query === 'string') {
            const m = query.match(/^\s*\/\/![ \t]*(\S.*)/);

            if (m) {
                return { label: true, text: m[1].trim() };
            }

            return { label: false, text: query.trim() };
        }

        return { label: false, text: '' };
    }

    function walk(
        layerEl: HTMLElement | null,
        node: GraphNode,
        parentWalkNode: GraphWalkNode | null,
        path: number[],
        currentPath: number[]
    ) {
        if (!Array.isArray(currentPath)) {
            currentPath = [];
        }

        if (!layerEl) {
            graphLayerEls.push(layerEl = createGraphLayer());
            nextGraphNodeElByLayer.set(layerEl, []);
            graphLayerHeights.push(0);

            if (graphLayerEls.length === 1) {
                layerEl.append(createElement('button', {
                    class: 'view-button',
                    tabindex: -1,
                    'data-action': 'new-root-node'
                }, '+'));
            }
        }

        const isTarget = currentPath.length === 1;
        const isCurrent = currentPath.length > 1;
        const nodeEl = nextGraphNodeElByLayer.get(layerEl)?.shift() || layerEl.appendChild(createGraphNode());
        const nodeLayerPos = graphLayerHeights[path.length - 1];
        const graphWalkNode: GraphWalkNode = {
            parent: parentWalkNode,
            children: [],
            node,
            nodeEl,
            layerIndex: path.length - 1,
            layerPos: nodeLayerPos,
            layerOptPos: nodeLayerPos
        };

        graphWalkNodes.push(graphWalkNode);
        graphLayerHeights[path.length - 1]++;
        updateGraphNodeEl(nodeEl, path, isTarget ? { ...node, ...targetNode } : node);
        nodeEl.classList.toggle('target', isTarget);
        nodeEl.classList.toggle('current', isCurrent);

        host.view.attachTooltip(nodeEl, {
            className: 'query-graph-tooltip',
            hideOnTriggerClick: true,
            content: isTarget ? 'badge:"Current query"' : {
                view: 'source',
                syntax: '=query | trim() ? "jora" : false',
                source: '=query | trim() ?: "<empty query>"',
                actionCopySource: false,
                lineNum: false
            }
        }, { query: node.query });

        if (Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                const childWalkNode = walk(
                    layerEl.nextSibling as HTMLElement,
                    node.children[i],
                    graphWalkNode,
                    path.concat(i),
                    currentPath[1] === i ? currentPath.slice(1) : []
                );

                graphWalkNode.children.push(childWalkNode);
                connections.push([nodeEl.lastChild as HTMLElement, childWalkNode.nodeEl]);
            }
        }

        return graphWalkNode;
    }

    const graphWalkNodes: GraphWalkNode[] = []; // DFS order
    const graphLayerEls = [...el.querySelectorAll(':scope > .query-graph-layer')] as HTMLElement[];
    const nextGraphNodeElByLayer = graphLayerEls.reduce(
        (map, layerEl) => map.set(layerEl, [...layerEl.querySelectorAll(':scope > .query-graph-node')] as HTMLElement[]),
        new Map<HTMLElement, HTMLElement[]>()
    );
    const graphLayerHeights = new Array(nextGraphNodeElByLayer.size).fill(0);
    const connections: [from: HTMLElement, to: HTMLElement][] = [];
    const svgEl = el.querySelector(':scope > svg') || el.appendChild(svg('svg'));

    // create update nodes
    for (let i = 0; i < graph.children.length; i++) {
        walk(
            graphLayerEls[0],
            graph.children[i],
            null,
            [i],
            graph.current[0] === i ? graph.current : []
        );
    }

    // remove unused nodes
    for (const nodeEls of nextGraphNodeElByLayer.values()) {
        for (const nodeEl of nodeEls) {
            nodeEl.remove();
        }
    }

    // refine node positions
    const maxLayerHeight = graphLayerHeights.reduce((max, height) => Math.max(max, height));
    const layerStackHeights = graphLayerHeights.map(() => 0);
    for (const node of graphWalkNodes) {
        const { parent } = node;

        // adjust non-root nodes positions
        if (parent) {
            // adjust child pos related to parent node pos
            const childrenCount = parent.node.children?.length || 1;
            const minPos = layerStackHeights[node.layerIndex];
            const maxPos = maxLayerHeight - (graphLayerHeights[node.layerIndex] - node.layerPos);
            let layerOptPos = clamp(
                parent.layerPos - Math.floor((childrenCount - 1) / 2),
                minPos,
                maxPos
            );

            // adjust node position related to default children block position
            if (node.children.length > 0 && minPos > 0) {
                const childrenAdjust = clamp(
                    node.children[0].layerPos, // + Math.floor((node.children.length - 1) / 2),
                    Math.max(layerOptPos, layerStackHeights[node.layerIndex + 1]),
                    maxPos
                );

                layerOptPos += clamp(childrenAdjust - layerOptPos, 0, 2);
            }

            // apply adjusted position
            node.layerPos = layerOptPos;
        }

        node.nodeEl.style.setProperty('--pad', String(node.layerPos - layerStackHeights[node.layerIndex]));
        layerStackHeights[node.layerIndex] = node.layerPos + 1;
    }

    requestAnimationFrame(() => {
        const gap = parseInt(getComputedStyle(el).gap);
        const defaultConnectionEls: SVGElement[] = [];
        const currentConnectionEls: SVGElement[] = [];

        for (const [fromEl, toEl] of connections) {
            const fromBox = getBoundingRect(fromEl, svgEl);
            const toBox = getBoundingRect(toEl, svgEl);

            const x0 = fromBox.right + 2;
            const x1 = Math.max(toBox.left - gap - 10, x0);
            const y1 = fromBox.top + fromBox.height / 2;
            const x2 = toBox.left - 3;
            const y2 = toBox.top + toBox.height / 2;
            const dx = (x2 - x1) / 3;

            const isCurrent = toEl.classList.contains('current') || toEl.classList.contains('target');
            const connectionEl = y1 === y2
                ? svg('line', {
                    stroke: '#888',
                    x1: x0,
                    y1,
                    x2,
                    y2
                })
                : svg('path', {
                    stroke: '#888',
                    fill: 'none',
                    d: `M ${x0} ${y1} H ${x1} C ${x1 + 2 * dx} ${y1} ${
                        x2 - 2 * dx
                    } ${y2} ${x2} ${y2}`
                });

            if (isCurrent) {
                currentConnectionEls.push(connectionEl);
                connectionEl.classList.add('current');
            } else {
                defaultConnectionEls.push(connectionEl);
            }

        }

        svgEl.replaceChildren(...defaultConnectionEls, ...currentConnectionEls);
    });
}

function normalizeGraph(inputGraph: Partial<Graph>): Graph {
    const graph = {
        current: Array.isArray(inputGraph.current)
            ? inputGraph.current
            : [],
        children: Array.isArray(inputGraph.children)
            ? inputGraph.children
            : []
    };

    if (graph.current.length === 0) {
        graph.current.push(0);
    }

    if (graph.children.length === 0) {
        graph.children.push({});
    }

    return graph;
}

function getPathInGraph(graph: Graph, path: number[]) {
    const result: GraphNode[] = [];
    let cursor: Graph | GraphNode = graph;

    for (let i = 0; i < path.length; i++) {
        cursor = cursor.children?.[path[i]] || {};
        result.push(cursor);
    }

    return result;
}

function insertNewNodeAfterLast(children: GraphNode[], last: GraphNode, newNode = {}) {
    const lastIndex = children.indexOf(last);

    if (lastIndex !== -1) {
        const newNodeIndex = lastIndex + 1;
        children.splice(newNodeIndex, 0, newNode);
        return newNodeIndex;
    }

    return children.push({}) - 1;
}

export default function(host: ViewModel, updateHostParams: UpdateHostParams) {
    const QueryEditorClass = (host.view as any).QueryEditor as typeof QueryEditor;
    const defaultGraph = {};
    let expandQueryInput: undefined | 'data' | 'context';
    let expandQueryInputData: unknown = NaN;
    let expandQueryResults = false;
    let expandQueryResultData: unknown = NaN;
    let currentQuery: string | undefined;
    let currentView: string | undefined;
    let currentGraph = normalizeGraph({});
    let currentContext: unknown;
    let currentDatasets: ViewDataset[] = [];
    let errorMarker: EditorErrorMarker | null = null;
    let computationCache: Computation[] = [];
    let computationPlan: Computation[] = [];
    let computationPlanTarget: Computation | null = null;
    let computationPath: number[] = [];

    let queryEditorSuggestionsEl: HTMLInputElement;
    let queryEditorLiveEditEl: HTMLInputElement;
    const getQuerySuggestions = (query: string, offset: number, data: unknown, context: unknown) =>
        queryEditorSuggestionsEl.checked ? host.querySuggestions(query, offset, data, context) : null;
    const queryEditor = new QueryEditorClass(getQuerySuggestions).on('change', (value, change) => {
        if (!queryEditorLiveEditEl.checked) {
            return;
        }

        // cancel current plan and render (if any) when editor's value changed by user input
        if (change.origin !== 'setValue') {
            computationPlan = computationPlan.slice();
            host.cancelScheduledRender();
        }

        if (errorMarker) {
            errorMarker.clear();
            errorMarker = null;
        }

        // update params
        updateHostParams({ query: value }, true);
    });
    const queryEngineInfo = host.getQueryEngineInfo();
    const queryGraphButtonsEl = createElement('div', 'query-graph-actions');
    const queryEditorButtonsEl = createElement('div', 'buttons');
    const queryEditorInputEl = createElement('div', 'query-input');
    const queryEditorInputDetailsEl = createElement('div', 'query-input-details');
    const queryEditorResultEl = createElement('div', 'data-query-result');
    const queryEditorResultDetailsEl = createElement('div', 'data-query-result-details');
    const queryEditorDatasetsEl = createElement('div', 'query-datasets');
    const queryGraphEl = createElement('div', 'query-graph');
    const queryPathEl = createElement('div', 'query-path');
    const queryEditorFormEl = createElement('div', 'form query-editor-form', [
        queryEditorDatasetsEl,
        queryGraphEl,
        queryPathEl,
        createElement('div', 'query-editor', [
            queryEditor.el
        ])
    ]);

    queryEditor.inputPanelEl.append(
        queryGraphButtonsEl,
        queryEditorInputEl,
        queryEditorInputDetailsEl,
        createElement('a', { class: 'view-link query-engine', href: queryEngineInfo.link, target: '_blank' }, [
            `${queryEngineInfo.name} ${queryEngineInfo.version || ''}`
        ])
    );
    queryEditor.outputPanelEl.append(
        queryEditorResultEl,
        queryEditorButtonsEl,
        queryEditorResultDetailsEl
    );

    // FIXME: temporary until full migration on discovery render
    const hintTooltip = (text: string | (() => string)): TooltipConfig => ({
        position: 'trigger',
        className: 'hint-tooltip',
        showDelay: true,
        content: {
            view: 'context',
            data: typeof text === 'function' ? text : () => text,
            content: 'md'
        }
    });

    function createSubquery(query = '') {
        mutateGraph(({ nextGraph, last }) => {
            if (!Array.isArray(last.children)) {
                last.children = [];
            }

            last.query = currentQuery;
            last.view = currentView;
            nextGraph.current.push(last.children.push({}) - 1);

            return {
                query,
                view: undefined,
                graph: nextGraph
            };
        });
    }

    host.view.render(queryGraphButtonsEl, [
        {
            view: 'button',
            className: 'subquery',
            tooltip: hintTooltip('Create a new query for a result of current one'),
            onClick: createSubquery
        },
        {
            view: 'button',
            className: 'stash',
            tooltip: hintTooltip(() => currentGraph.current.length < 2
                ? 'Stash current query and create a new empty root query'
                : 'Stash current query and create a new empty query for current parent'
            ),
            onClick() {
                mutateGraph(({ nextGraph, last, preLast }) => {
                    const preLastChildren = preLast.children || [];

                    last.query = currentQuery;
                    last.view = currentView;
                    nextGraph.current[nextGraph.current.length - 1] = insertNewNodeAfterLast(preLastChildren, last);

                    return {
                        query: '',
                        view: undefined,
                        graph: nextGraph
                    };
                });
            }
        },
        {
            view: 'button',
            className: 'clone',
            tooltip: hintTooltip('Clone current query'),
            onClick() {
                mutateGraph(({ nextGraph, last, preLast }) => {
                    const preLastChildren = preLast.children || [];

                    last.query = currentQuery;
                    last.view = currentView;
                    nextGraph.current[nextGraph.current.length - 1] = insertNewNodeAfterLast(preLastChildren, last);

                    return {
                        graph: nextGraph
                    };
                });
            }
        },
        {
            view: 'button',
            className: 'delete',
            tooltip: hintTooltip('Delete current query and all the descendants'),
            onClick() {
                mutateGraph(({ nextGraph, last, preLast }) => {
                    const index = preLast.children?.indexOf(last) ?? -1;
                    let nextQuery = preLast.query;
                    const nextView = preLast.view;

                    preLast.children?.splice(index, 1);
                    if (!preLast.children?.length) {
                        preLast.children = undefined;
                    }

                    nextGraph.current.pop();
                    if (nextGraph.current.length === 0) {
                        const targetIndex = Math.max(0, Math.min(index - 1, (nextGraph.children?.length || 0) - 1));
                        nextGraph.current.push(targetIndex);
                        nextQuery = nextGraph.children?.[targetIndex]?.query;
                    }

                    return {
                        query: nextQuery,
                        view: nextView,
                        graph: nextGraph
                    };
                });
            }
        }
    ]);
    queryEditorButtonsEl.append(
        createElement('label', {
            class: 'view-checkbox suggestions',
            tabindex: 0
        }, [
            queryEditorSuggestionsEl = createElement('input', {
                class: 'live-update',
                type: 'checkbox',
                checked: true,
                onchange() {
                    queryEditor.focus();
                    queryEditor.cm.showHint();
                }
            }),
            createElement('span', 'view-checkbox__label', 'suggestions')
        ]),
        createElement('label', {
            class: 'view-checkbox live-update',
            tabindex: 0
        }, [
            queryEditorLiveEditEl = createElement('input', {
                class: 'live-update',
                type: 'checkbox',
                checked: true,
                onchange({ target }) {
                    queryEditor.focus();

                    if ((target as HTMLInputElement).checked) {
                        updateHostParams({
                            query: queryEditor.getValue()
                        }, true);
                    }
                }
            }),
            createElement('span', 'view-checkbox__label', 'process on input')
        ])
    );
    host.view.attachTooltip(queryEditorSuggestionsEl.parentNode as HTMLElement, hintTooltip(() => queryEditorSuggestionsEl.checked
        ? 'Query suggestions enabled<br>(click to disable)'
        : 'Query suggestions disabled<br>(click to enable)'
    ));
    host.view.attachTooltip(queryEditorLiveEditEl.parentNode as HTMLElement, hintTooltip(() => queryEditorLiveEditEl.checked
        ? 'Auto-perform query enabled<br>(click to disable)'
        : 'Auto-perform query disabled<br>(click to enable)'
    ));
    host.view.render(queryEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Process"',
        onClick: () => {
            computationCache = computationCache.slice(0, currentGraph.current.length - 1);
            updateHostParams({
                query: queryEditor.getValue()
            }, true);
            host.scheduleRender('page'); // force render
        }
    });

    queryPathEl.addEventListener('click', ({ target }) => {
        const closestQueryPathEl = (target as Element).closest('.query-path > *') as Element;
        const idx = [...queryPathEl.children].indexOf(closestQueryPathEl);

        if (idx !== -1) {
            mutateGraph(({ nextGraph, currentPath, last }) => {
                last.query = currentQuery;

                nextGraph.current = nextGraph.current.slice(0, idx + 1);

                return {
                    query: (currentPath[idx + 1] as GraphNode).query,
                    graph: nextGraph
                };
            });
        }
    });
    queryGraphEl.addEventListener('click', ({ target }) => {
        const actionEl = (target as HTMLElement).closest('[data-action]') as (HTMLElement | null);

        if (!queryGraphEl.contains(actionEl)) {
            return;
        }

        switch (actionEl?.dataset.action) {
            case 'new-root-node':
                mutateGraph(({ nextGraph, last }) => {
                    last.query = currentQuery;
                    last.view = currentView;
                    nextGraph.current = [nextGraph.children.push({}) - 1];

                    return {
                        query: '',
                        view: undefined,
                        graph: nextGraph
                    };
                });
                break;

            case 'select':
                const { path } = actionEl.dataset;

                if (typeof path === 'string' && path !== currentGraph.current.join(' ')) {
                    mutateGraph(({ nextGraph, last }) => {
                        const nextPath = path.split(' ').map(Number);
                        const nextGraphPath = getPathInGraph(nextGraph, nextPath);
                        const nextTarget: GraphNode = nextGraphPath[nextGraphPath.length - 1];
                        const nextQuery = nextTarget.query;
                        const nextView = nextTarget.view;

                        nextTarget.query = undefined;
                        nextTarget.view = undefined;
                        last.query = currentQuery;
                        last.view = currentView;
                        nextGraph.current = nextPath;

                        return {
                            query: nextQuery,
                            view: nextView,
                            graph: nextGraph
                        };
                    }, false);
                }
                break;
        }
    });

    function updateParams(patch: Record<string, unknown>, autofocus = true, replace = false) {
        updateHostParams(patch, replace);

        if (autofocus) {
            setTimeout(() => {
                queryEditor.focus();
                queryEditor.cm.setCursor(queryEditor.cm.lineCount(), 0);
            }, 0);
        }
    }

    function mutateGraph(fn: GraphMutator, autofocus = true) {
        const nextGraph = JSON.parse(JSON.stringify(currentGraph)); // accept only serializable data, clean up undefined
        const currentPath: GraphNodePath = [nextGraph, ...getPathInGraph(nextGraph, nextGraph.current)];
        const last = currentPath[currentPath.length - 1];
        const preLast = currentPath[currentPath.length - 2];

        const params = fn({ nextGraph, currentPath, last, preLast });

        updateParams(params, autofocus);
    }

    function syncInputData(computation: Computation) {
        queryEditorInputEl.innerHTML = '';
        queryEditorInputEl.append(
            createElement('div', {
                class: 'query-input-data',
                tabindex: -1,
                onclick() {
                    expandQueryInput = expandQueryInput === 'data' ? undefined : 'data';
                    syncExpandInputData(computation);
                }
            }, [
                createElement('span', { class: 'query-input-variable', 'data-name': 'input' }, ['@']),
                computation.state === 'awaiting'
                    ? 'Computing...'
                    : computation.state === 'canceled'
                        ? 'Not available (undefined)'
                        : createNumDelimElement(valueDescriptor(computation.data))
            ]),
            createElement('div', {
                class: 'query-input-context',
                tabindex: -1,
                onclick() {
                    expandQueryInput = expandQueryInput === 'context' ? undefined : 'context';
                    syncExpandInputData(computation);
                }
            }, [
                createElement('span', { class: 'query-input-variable', 'data-name': 'context' }, ['#']),
                computation.state === 'awaiting'
                    ? 'Computing...'
                    : computation.state === 'canceled'
                        ? 'Not available (undefined)'
                        : createNumDelimElement(valueDescriptor(computation.context))
            ])
        );

        syncExpandInputData(computation);
    }

    function syncExpandInputData(computation: Computation) {
        queryEditor.inputPanelEl.classList.toggle('details-expanded', expandQueryInput !== undefined);
        queryEditorInputEl.dataset.details = expandQueryInput;

        if (expandQueryInput) {
            const newData = computation.state !== 'awaiting' && computation.state !== 'canceled'
                ? computation[expandQueryInput]
                : NaN;

            if (newData !== expandQueryInputData) {
                expandQueryInputData = newData;

                if (computation.state === 'awaiting') {
                    queryEditorInputDetailsEl.textContent = '<div class="state-message">Computing...</div>';
                } else if (computation.state === 'canceled') {
                    queryEditorInputDetailsEl.innerHTML = '<div class="state-message">Not available because one of ancestor queries failed<div>';
                } else {
                    queryEditorInputDetailsEl.innerHTML = '';
                    host.view.render(
                        queryEditorInputDetailsEl,
                        [
                            { view: 'struct', expanded: 1 }
                        ],
                        expandQueryInputData
                    );
                }
            }
        } else {
            expandQueryInputData = NaN;
            queryEditorInputDetailsEl.innerHTML = '';
        }
    }

    function renderOutputExpander(computation: Computation, prelude: string | null, message: (string | Node)[] | string) {
        const content = [
            createElement('span', 'query-output-message', Array.isArray(message) ? message : [message])
        ];

        if (prelude) {
            content.unshift(createElement('span', 'query-output-prelude', [prelude]));
        }

        queryEditorResultEl.replaceChildren(
            createElement('div', {
                class: 'query-result-data' + (computation.state === 'failed' ? ' error' : ''),
                tabindex: -1,
                onclick() {
                    expandQueryResults = !expandQueryResults;
                    syncExpandOutputData(computation);
                }
            }, content)
        );
    }

    function syncOutputData(computation: Computation) {
        switch (computation.state) {
            case 'canceled': {
                queryEditor.setValue(computation.query);
                renderOutputExpander(computation, 'Result', 'Not available');
                break;
            }
            case 'awaiting': {
                queryEditor.setValue(computation.query);
                renderOutputExpander(computation, null, 'Awaiting...');
                break;
            }
            case 'computing': {
                queryEditor.setValue(computation.query, computation.data, computation.context);
                renderOutputExpander(computation, null, 'Computing...');
                break;
            }
            case 'successful': {
                queryEditor.setValue(computation.query, computation.data, computation.context);
                renderOutputExpander(computation, 'Result', [
                    createNumDelimElement(valueDescriptor(computation.computed)),
                    ' in ',
                    createNumDelimElement(Math.floor(computation.duration)),
                    'ms'
                ]);

                break;
            }

            case 'failed': {
                const { error } = computation;
                const range = error?.details?.loc?.range;
                const doc = queryEditor.cm.doc;

                if (error && Array.isArray(range) && range.length === 2) {
                    const [start, end] = range;

                    errorMarker = error.details?.token === 'EOF' || start === end || computation.query[start] === '\n'
                        ? doc.setBookmark(
                            doc.posFromIndex(start),
                            { widget: createElement('span', 'discovery-editor-error', ' ') }
                        )
                        : doc.markText(
                            doc.posFromIndex(start),
                            doc.posFromIndex(end),
                            { className: 'discovery-editor-error' }
                        );
                }

                queryEditor.setValue(computation.query, computation.data, computation.context);
                renderOutputExpander(computation, 'Error', [
                    error?.message.split(/\n/)[0].replace(/^(Parse error|Bad input).+/s, 'Parse error') || 'Error'
                ]);

                break;
            }
        }

        syncExpandOutputData(computation);
    }

    function syncExpandOutputData(computation: Computation) {
        queryEditor.outputPanelEl.classList.toggle('details-expanded', expandQueryResults);

        if (expandQueryResults) {
            const newData = computation.state !== 'awaiting' && computation.state !== 'canceled' && computation.state !== 'computing'
                ? computation.error || computation.computed
                : NaN;

            if (newData !== expandQueryResultData) {
                expandQueryResultData = newData;

                switch (computation.state) {
                    case 'awaiting':
                        queryEditorResultDetailsEl.innerHTML = '<div class="state-message">Awaiting for all of ancestor queries done<div>';
                        break;
                    case 'canceled':
                        queryEditorResultDetailsEl.innerHTML = '<div class="state-message">Not available because one of ancestor queries failed<div>';
                        break;
                    case 'failed':
                        queryEditorResultDetailsEl.innerHTML =
                            '<div class="discovery-error query-error">' +
                            escapeHtml(computation.error?.message || '') +
                            '</div>';
                        break;
                    case 'successful':
                        queryEditorResultDetailsEl.innerHTML = '';
                        host.view.render(queryEditorResultDetailsEl, { view: 'struct', expanded: 1 }, expandQueryResultData);
                        break;
                }
            }
        } else {
            expandQueryResultData = NaN;
            queryEditorResultDetailsEl.innerHTML = '';
        }
    }

    function syncComputeState(computation: Computation) {
        const graphNodeEl: HTMLElement | null = queryGraphEl.querySelector(`[data-path="${computation.path}"]`);

        if (graphNodeEl) {
            graphNodeEl.dataset.state = computation.state;
        }

        if (computation === computationPlanTarget) {
            syncInputData(computation);
            syncOutputData(computation);
        }
    }

    function executeComputationPlan(
        plan: Computation[],
        computeIndex: number,
        computeData: unknown,
        computeContext: unknown,
        scheduleTask = (fn: (...args: any[]) => any) => {
            setTimeout(fn, 1);
        }
    ): Promise<Computation> {
        // bailout if current plan has been changed
        if (plan !== computationPlan) {
            return Promise.reject('Computation plan is canceled');
        }

        for (let i = computeIndex, computeError = false; i < plan.length; i++) {
            const computation = plan[i];

            if (computation.state === 'awaiting') {
                computation.state = 'computing';
            }

            if (computeError) {
                computation.state = 'canceled';
            } else if (computation.state === 'failed') {
                computeError = true;
            }

            if (computation.state !== 'computing') {
                computeData = computation.computed;
                computeContext = computation.context; // in the future it can be changed
                syncComputeState(computation);

                if (computation === computationPlanTarget) {
                    return Promise.resolve(computation);
                }

                continue;
            }

            // computation.state === 'processing'
            return new Promise((resolve, reject) => {
                computation.data = computeData;
                computation.context = computeContext;
                syncComputeState(computation);

                // move computations to next tick to give a chance for a browser to update UI
                scheduleTask(() => {
                    // bailout if current plan has been changed
                    if (plan !== computationPlan) {
                        return Promise.reject('Computation plan is canceled');
                    }

                    const startTime = Date.now();

                    try {
                        computation.computed = host.query(computation.query, computation.data, computation.context);
                        computation.state = 'successful';
                    } catch (error) {
                        computation.error = error;
                        computation.state = 'failed';
                    }

                    computation.duration = Date.now() - startTime;

                    // compute next
                    setTimeout(
                        () => executeComputationPlan(plan, i, computeData, computeContext).then(resolve, reject),
                        1
                    );
                });
            });
        }

        return Promise.reject('No target computation found');
    }

    function createComputationPlan(graph: Graph, computeData: unknown, computeContext: unknown, cache: Computation[]) {
        const graphPath = graph.current;
        const graphNodePath = getPathInGraph(graph, graphPath);
        const plan: Computation[] = [];
        let computeError: Error | null = null;

        for (let i = 0, len = Math.min(graphPath.length, cache.length); i < len; i++) {
            const cached = cache[i];
            const isTarget = i === graphPath.length - 1;
            const computeQuery = isTarget ? currentQuery : graphNodePath[i].query || '';

            if (!Object.is(cached.query, computeQuery) ||
                !Object.is(cached.data, computeData) ||
                !Object.is(cached.context, computeContext)) {
                break;
            }

            plan.push(cached);
            cached.path = graphPath.slice(0, i + 1).join(' ');
            computeData = cached.computed;
            computeError = cached.error;
        }

        for (let i = plan.length; i < graphPath.length; i++) {
            const isTarget = i === graphPath.length - 1;
            const computeQuery = isTarget ? currentQuery : graphNodePath[i].query || '';
            const computation: Computation = cache[i] = {
                state: computeError ? 'canceled' : 'awaiting',
                path: graphPath.slice(0, i + 1).join(' '),
                query: computeQuery || '',
                data: undefined,
                context: undefined,
                computed: undefined,
                error: null,
                duration: 0
            };

            cache[i] = computation;
            plan.push(computation);
        }

        return plan;
    }

    function isEqualArrays(a: unknown[], b: unknown[]) {
        if (a === b) {
            return true;
        }

        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i++) {
            if (!Object.is(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }

    function computeGraph(graph: Graph, data: unknown, context: unknown) {
        const nextPlan = createComputationPlan(graph, data, context, computationCache);
        const nextTarget = nextPlan[nextPlan.length - 1];
        const planChanged = !isEqualArrays(computationPlan, nextPlan);
        const pathChanged = !isEqualArrays(computationPath, graph.current);

        computationPlan = nextPlan;
        computationPath = graph.current;

        if (nextTarget !== computationPlanTarget) {
            computationPlanTarget = nextTarget;
            syncComputeState(nextTarget);
        }

        const result = executeComputationPlan(computationPlan, 0, data, context, fn => requestAnimationFrame(() => setTimeout(fn, 1)));

        if (planChanged || pathChanged) {
            const pathState = new Map(nextPlan.map(({ path, state }) => [path, state]));

            // sync graph node states with current computation path
            for (const el of queryGraphEl.querySelectorAll('[data-path]')) {
                const graphNodeEl = el as HTMLElement;
                const prevState = graphNodeEl.dataset.state;
                const nextState = pathState.get(graphNodeEl.dataset.path as string);

                if (prevState !== nextState) {
                    if (typeof nextState === 'string') {
                        graphNodeEl.dataset.state = nextState;
                    } else {
                        delete graphNodeEl.dataset.state;
                    }
                }
            }

            // A trick to reset all transitions on graph nodes, as transitions
            // can freeze when the main thread is blocked and display an incorrect state of nodes
            const placeholder = document.createComment('');
            queryGraphEl.replaceWith(placeholder);
            placeholder.replaceWith(queryGraphEl);
        }

        if (computationPlanTarget !== nextTarget) {
            computationPlanTarget = nextTarget;
            syncComputeState(computationPlanTarget);
        }

        return result;
    }

    return {
        el: queryEditorFormEl,
        createSubquery,
        appendToQuery(query) {
            const newQuery = typeof currentQuery === 'string' && currentQuery.trimRight() !== ''
                ? currentQuery.replace(/(\n[ \t]*)*$/, () => '\n| ' + query)
                : query;

            updateParams({ query: newQuery }, true, true);
        },
        perform(data: unknown, context: unknown) {
            const queryContext = contextWithoutEditorParams(context, currentContext);
            const pageParams = getParamsFromContext(context);
            const pageQuery = pageParams.query;
            const pageView = pageParams.view;
            const pageGraph = normalizeGraph({ ...pageParams.graph || defaultGraph });

            queryGraphButtonsEl.classList.toggle('root', pageGraph.current.length < 2);
            currentDatasets = syncDatasetsView(queryEditorDatasetsEl, queryContext.datasets || [], currentDatasets);
            syncQueryGraphView(queryGraphEl, pageGraph, host, { query: pageQuery, view: pageView });

            // queryPathEl.innerHTML = '';
            // for (const node of getPathInGraph(pageGraph, pageGraph.current).slice(1, -1)) {
            //     queryPathEl.append(createElement('div', 'query', (node as GraphNode).query || ''));
            // }

            currentGraph = pageGraph;
            currentContext = queryContext;
            currentQuery = pageQuery;
            currentView = pageView;

            // perform queries
            return computeGraph(currentGraph, data, queryContext);
        }
    };
}
