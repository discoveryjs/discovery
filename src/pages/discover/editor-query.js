import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { getBoundingRect } from '../../core/utils/layout.js';
import { contextWithoutEditorParams } from './params.js';


function count(value, one, many) {
    return value.length ? `${value.length} ${value.length === 1 ? one : many}` : 'empty';
}

function valueDescriptor(value) {
    if (Array.isArray(value)) {
        return `Array (${count(value, 'element', 'elements')})`;
    }

    if (value && typeof value === 'object') {
        return `Object (${count(Object.keys(value), 'entry', 'entries')})`;
    }

    return `Scalar (${value === null ? 'null' : typeof value})`;
}

function svg(tagName, attributes) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    if (attributes) {
        for (const [k, v] of Object.entries(attributes)) {
            el.setAttribute(k, v);
        }
    }

    return el;
}

function buildQueryGraph(el, graph, host) {
    function createBox() {
        return el.appendChild(createElement('div', 'query-graph-box'));
    }

    function walk(box, node, path, currentPath) {
        if (!Array.isArray(currentPath)) {
            currentPath = [];
        }

        if (!box) {
            box = createBox();
        }

        const isTarget = currentPath.length === 1;
        const isCurrent = currentPath.length > 1;
        const nodeEl = box.appendChild(createElement('div', {
            'data-path': path.join(' '),
            class: `query-graph-node${
                isTarget
                    ? ' target'
                    : isCurrent
                        ? ' current'
                        : ''
            }`
        }));

        host.view.attachTooltip(nodeEl, {
            className: 'query-graph-tooltip',
            content: isTarget ? 'badge:"Current query"' : {
                view: 'source',
                data: !node.query ? { content: '<empty query>', lineNum: false } : {
                    syntax: 'jora',
                    content: node.query || '',
                    lineNum: false
                }
            }
        });

        if (Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                const childEl = walk(
                    box.nextSibling,
                    node.children[i],
                    path.concat(i),
                    currentPath[1] === i ? currentPath.slice(1) : []
                );

                connections.push([nodeEl, childEl]);
            }
        }

        return nodeEl;
    }

    let connections = [];
    for (let i = 0; i < graph.children.length; i++) {
        walk(el.firstChild, graph.children[i], [i], graph.current[0] === i ? graph.current : []);
    }

    requestAnimationFrame(() => {
        const svgEl = el.appendChild(svg('svg'));
        for (const [fromEl, toEl] of connections) {
            const fromBox = getBoundingRect(fromEl, svgEl);
            const toBox = getBoundingRect(toEl, svgEl);

            const x1 = fromBox.right - 2;
            const y1 = fromBox.top + fromBox.height / 2;
            const x2 = toBox.left + 2;
            const y2 = toBox.top + toBox.height / 2;
            const dx = (x2 - x1) / 3;

            svgEl.append(
                y1 === y2
                    ? svg('line', {
                        stroke: '#888',
                        x1,
                        y1,
                        x2,
                        y2
                    })
                    : svg('path', {
                        stroke: '#888',
                        fill: 'none',
                        d: `M ${x1} ${y1} C ${x1 + 2 * dx} ${y1} ${
                            x2 - 2 * dx
                        } ${y2} ${x2} ${y2}`
                    })
            );
        }
    });
}

function normalizeGraph(graph) {
    if (!Array.isArray(graph.current)) {
        graph.current = [];
    }

    if (graph.current.length === 0) {
        graph.current.push(0);
    }

    if (!Array.isArray(graph.children)) {
        graph.children = [];
    }

    if (graph.children.length === 0) {
        graph.children.push({});
    }
}

function getPathInGraph(graph, path) {
    const result = [graph];
    let cursor = graph;

    for (let i = 0; i < path.length; i++) {
        cursor = cursor.children[path[i]];
        result.push(cursor);
    }

    return result;
}

export default function(host, updateParams) {
    let expandQueryInput = false;
    let expandQueryInputData = NaN;
    let expandQueryResults = false;
    let expandQueryResultData = NaN;
    let currentQuery;
    let currentView;
    let currentGraph = null;
    let currentContext;
    let errorMarker = null;
    let scheduledCompute = null;
    let computationCache = [];
    const defaultGraph = {};

    let queryEditorLiveEditEl;
    const getQuerySuggestions = (query, offset, data, context) => host.querySuggestions(query, offset, data, context);
    const queryEditor = new host.view.QueryEditor(getQuerySuggestions).on('change', value =>
        queryEditorLiveEditEl.checked && updateParams({ query: value }, true)
    );
    const queryEngineInfo = host.getQueryEngineInfo();
    const queryGraphButtonsEl = createElement('div', 'query-graph-actions');
    const queryEditorButtonsEl = createElement('div', 'buttons');
    const queryEditorInputEl = createElement('div', 'query-input');
    const queryEditorInputDetailsEl = createElement('div', 'query-input-details');
    const queryEditorResultEl = createElement('div', 'data-query-result');
    const queryEditorResultDetailsEl = createElement('div', 'data-query-result-details');
    const queryGraphEl = createElement('div', 'query-graph');
    const queryPathEl = createElement('div', 'query-path');
    const queryEditorFormEl = createElement('div', 'form query-editor-form', [
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
    const hintTooltip = (text) => ({
        position: 'trigger',
        className: 'hint-tooltip',
        showDelay: true,
        content: { view: 'context', data: { text }, content: 'text:text' }
    });
    host.view.render(queryGraphButtonsEl, [
        { view: 'button', className: 'subquery', tooltip: hintTooltip('Create a new query for a result of current one'), onClick() {
            mutateGraph(({ nextGraph, last }) => {
                if (!Array.isArray(last.children)) {
                    last.children = [];
                }

                last.query = currentQuery;
                last.view = currentView;
                nextGraph.current.push(last.children.push({}) - 1);

                return {
                    query: '',
                    view: undefined,
                    graph: nextGraph
                };
            });
        } },
        { view: 'button', className: 'stash', tooltip: hintTooltip('Stash current query and create a new empty query for current parent'), onClick() {
            mutateGraph(({ nextGraph, last, preLast }) => {
                last.query = currentQuery;
                last.view = currentView;
                nextGraph.current[nextGraph.current.length - 1] = preLast.children.push({}) - 1;

                return {
                    query: '',
                    view: undefined,
                    graph: nextGraph
                };
            });
        } },
        { view: 'button', className: 'clone', tooltip: hintTooltip('Clone current query'), onClick() {
            mutateGraph(({ nextGraph, last, preLast }) => {
                last.query = currentQuery;
                last.view = currentView;
                nextGraph.current[nextGraph.current.length - 1] = preLast.children.push({}) - 1;

                return {
                    graph: nextGraph
                };
            });
        } },
        { view: 'button', className: 'delete', tooltip: hintTooltip('Delete current query and all the descendants'), onClick() {
            mutateGraph(({ nextGraph, last, preLast }) => {
                const index = preLast.children.indexOf(last);
                let nextQuery = preLast.query;

                preLast.children.splice(index, 1);
                if (preLast.children.length === 0) {
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
                    graph: nextGraph
                };
            });
        } }
    ]);
    queryEditorButtonsEl.append(
        createElement('label', 'view-checkbox', [
            queryEditorLiveEditEl = createElement('input', {
                class: 'live-update',
                type: 'checkbox',
                checked: true,
                onchange: (e) => {
                    if (e.target.checked) {
                        updateParams({
                            query: queryEditor.getValue()
                        }, true);
                    }
                }
            }),
            createElement('span', 'view-checkbox__label', 'process on input')
        ])
    );
    host.view.render(queryEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Process"',
        onClick: () => {
            computationCache = computationCache.slice(0, currentGraph.current.length - 1);
            updateParams({
                query: queryEditor.getValue()
            }, true);
            host.scheduleRender('page'); // force render
        }
    });

    queryPathEl.addEventListener('click', (e) => {
        const idx = [...queryPathEl.children].indexOf(e.target.closest('.query-path > *'));

        if (idx !== -1) {
            mutateGraph(({ nextGraph, currentPath, last }) => {
                last.query = currentQuery;

                nextGraph.current = nextGraph.current.slice(0, idx + 1);

                updateParams({
                    query: currentPath[idx + 1].query,
                    graph: nextGraph
                });
            });
        }
    });
    queryGraphEl.addEventListener('click', (e) => {
        const path = e.target.dataset.path;
        if (typeof path === 'string' && path !== currentGraph.current.join(' ')) {
            mutateGraph(({ nextGraph, last }) => {
                const nextPath = path.split(' ').map(Number);
                const nextGraphPath = getPathInGraph(nextGraph, nextPath);
                const nextTarget = nextGraphPath[nextGraphPath.length - 1];

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
            });
        }
    });

    function mutateGraph(fn) {
        const nextGraph = JSON.parse(JSON.stringify(currentGraph));
        const currentPath = getPathInGraph(nextGraph, nextGraph.current);
        const last = currentPath[currentPath.length - 1];
        const preLast = currentPath[currentPath.length - 2];

        const params = fn({ nextGraph, currentPath, last, preLast });

        updateParams(params);
        setTimeout(() => {
            queryEditor.focus();
            queryEditor.cm.setCursor(queryEditor.cm.lineCount(), 0);
        }, 0);
    }

    function scheduleCompute(fn) {
        const id = setTimeout(fn, 16);
        return () => clearTimeout(id);
    }

    function syncInputData(computation) {
        queryEditorInputEl.innerHTML = '';
        queryEditorInputEl.append(
            createElement('div', {
                class: 'query-input-data',
                onclick() {
                    expandQueryInput = expandQueryInput === 'data' ? false : 'data';
                    syncExpandInputData(computation);
                }
            }, [
                createElement('span', { class: 'query-input-variable', 'data-name': 'input' }, ['@']),
                computation.state === 'awaiting'
                    ? 'Computing...'
                    : computation.state === 'canceled'
                        ? 'Not available (undefined)'
                        : valueDescriptor(computation.data)
            ]),
            createElement('div', {
                class: 'query-input-context',
                onclick() {
                    expandQueryInput = expandQueryInput === 'context' ? false : 'context';
                    syncExpandInputData(computation);
                }
            }, [
                createElement('span', { class: 'query-input-variable', 'data-name': 'context' }, ['#']),
                computation.state === 'awaiting'
                    ? 'Computing...'
                    : computation.state === 'canceled'
                        ? 'Not available (undefined)'
                        : valueDescriptor(computation.context)
            ])
        );

        syncExpandInputData(computation);
    }

    function syncExpandInputData(computation) {
        queryEditor.inputPanelEl.classList.toggle('details-expanded', expandQueryInput);
        queryEditorInputEl.dataset.details = expandQueryInput;

        if (expandQueryInput) {
            const newData = computation.state !== 'awaiting' && computation.state !== 'canceled'
                ? computation[expandQueryInput]
                : NaN;

            if (newData !== expandQueryInputData) {
                expandQueryInputData = newData;

                if (computation.state === 'awaiting') {
                    queryEditorInputDetailsEl.textContent = 'Computing...';
                } else if (computation.state === 'canceled') {
                    queryEditorInputDetailsEl.textContent = 'Not available because one of ancestor queries failed';
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

    function renderOutputExpander(computation, prelude, message) {
        if (!message) {
            message = prelude;
            prelude = null;
        }

        const content = [
            createElement('span', 'query-output-message', Array.isArray(message) ? message : [message])
        ];

        if (prelude) {
            content.unshift(createElement('span', 'query-output-prelude', [prelude]));
        }

        queryEditorResultEl.replaceChildren(
            createElement('div', {
                class: 'query-result-data' + (computation.state === 'failed' ? ' error' : ''),
                onclick() {
                    expandQueryResults = !expandQueryResults;
                    syncExpandOutputData(computation);
                }
            }, content)
        );
    }

    function syncOutputData(computation) {
        if (errorMarker) {
            errorMarker.clear();
            errorMarker = null;
        }

        switch (computation.state) {
            case 'canceled': {
                queryEditor.setValue(computation.query);
                renderOutputExpander(computation, 'Result', 'Not available');
                break;
            }
            case 'awaiting': {
                queryEditor.setValue(computation.query);
                renderOutputExpander(computation, 'Avaiting...');
                break;
            }
            case 'computing': {
                queryEditor.setValue(computation.query, computation.data, computation.context);
                renderOutputExpander(computation, 'Computing...');
                break;
            }
            case 'successful': {
                queryEditor.setValue(computation.query, computation.data, computation.context);
                renderOutputExpander(computation, 'Result', [
                    valueDescriptor(computation.computed),
                    ` in ${parseInt(computation.duration, 10)}ms`
                ]);

                break;
            }

            case 'failed': {
                const { error } = computation;
                const range = error?.details?.loc?.range;
                const doc = queryEditor.cm.doc;

                if (Array.isArray(range) && range.length === 2) {
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
                    error.message.split(/\n/)[0].replace(/^(Parse error|Bad input).+/s, 'Parse error')
                ]);

                break;
            }
        }

        syncExpandOutputData(computation);
    }

    function syncExpandOutputData(computation) {
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
                            escapeHtml(computation.error.message) +
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

    function syncComputeState(computation) {
        const path = computation.path.join(' ');
        const graphNodeEl = queryGraphEl.querySelector(`[data-path="${path}"]`);

        if (graphNodeEl) {
            graphNodeEl.dataset.state = computation.state;
        }

        if (computationCache[currentGraph.current.length - 1] === computation) {
            syncInputData(computation);
            syncOutputData(computation);
        }
    }

    function compute(computeIndex, computeData, computeContext, first) {
        if (scheduledCompute) {
            scheduledCompute.cancel();
            scheduledCompute.computation.state = 'canceled';
            scheduledCompute = null;
        }

        let computeError = false;

        if (first) {
            for (let i = computeIndex; i < currentGraph.current.length; i++) {
                const computation = computationCache[i];
                if (computation.state !== 'computing') {
                    syncComputeState(computation);
                }
            }
        }

        for (let i = computeIndex; i < currentGraph.current.length; i++) {
            const computation = computationCache[i];
            const isTarget = i === currentGraph.current.length - 1;

            if (computation.state === 'awaiting') {
                computation.state = 'computing';
            }

            if (computation.state === 'failed') {
                computeError = true;
            } else if (computeError) {
                computation.state = 'canceled';
            }

            if (computation.state !== 'computing') {
                computeData = computation.computed;
                computeContext = computation.context; // in the future it can be changed
                syncComputeState(computation);

                if (isTarget) {
                    return Promise.resolve(computation);
                }

                continue;
            }

            return new Promise((resolve, reject) => {
                computation.data = computeData;
                computation.context = computeContext;
                syncComputeState(computation);
                scheduledCompute = {
                    computation,
                    cancel: scheduleCompute(() => {
                        let startTime = Date.now();

                        scheduledCompute = null;

                        // while (Date.now() - startTime < 500) {
                        //     //
                        // }

                        try {
                            computation.computed = host.query(computation.query, computation.data, computation.context);
                            computation.state = 'successful';
                        } catch (error) {
                            computation.error = error;
                            computation.state = 'failed';
                        }

                        computation.duration = Date.now() - startTime;

                        // compute next
                        compute(
                            i,
                            computeData,
                            computeContext
                        ).then(resolve, reject);
                    })
                };
            });
        }
    }

    function makeComputationPlan(computeData, computeContext) {
        const graphPath = getPathInGraph(currentGraph, currentGraph.current).slice(1);
        let firstComputation = -1;
        let computeError = null;

        for (let i = 0; i < currentGraph.current.length; i++) {
            const graphNode = graphPath[i];
            const cache = computationCache[i] || {};
            const isTarget = i === currentGraph.current.length - 1;
            const computeQuery = isTarget ? currentQuery : graphNode.query;
            const computePath = currentGraph.current.slice(0, i + 1);

            if (firstComputation === -1 &&
                cache.query === computeQuery &&
                cache.data === computeData &&
                cache.context === computeContext &&
                String(cache.path) === String(computePath)) {
                computeData = cache.computed;
                computeError = cache.error;
                continue;
            }

            const computation = computationCache[i] = {
                state: 'awaiting',
                path: currentGraph.current.slice(0, i + 1),
                query: computeQuery,
                data: undefined,
                context: undefined,
                computed: undefined,
                error: null,
                duration: 0
            };

            if (computeError) {
                computation.state = 'canceled';
                continue;
            }

            if (firstComputation === -1) {
                firstComputation = i;
                computation.state = 'computing';
                computation.data = computeData;
                computation.context = computeContext;
                continue;
            }
        }

        return firstComputation !== -1
            ? computationCache.slice(firstComputation, currentGraph.current.length)
            : [];
    }

    return {
        el: queryEditorFormEl,
        perform(data, context) {
            const queryContext = contextWithoutEditorParams(context, currentContext);
            const pageQuery = context.params.query;
            const pageView = context.params.view;
            const pageGraph = { ...context.params.graph || defaultGraph };

            normalizeGraph(pageGraph);

            queryGraphEl.innerHTML = '';
            buildQueryGraph(queryGraphEl, pageGraph, host);

            queryPathEl.innerHTML = '';
            for (const node of getPathInGraph(pageGraph, pageGraph.current).slice(1, -1)) {
                queryPathEl.append(createElement('div', 'query', node.query || ''));
            }

            currentGraph = pageGraph;
            currentContext = queryContext;
            currentQuery = pageQuery;
            currentView = pageView;

            // perform queries
            makeComputationPlan(data, queryContext);
            return compute(0, data, queryContext, true);
        }
    };
}
