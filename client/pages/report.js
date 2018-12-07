/* eslint-env browser */

import * as base64 from '../core/utils/base64.js';
import { createElement, createText } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local

const viewModeSource = {
    default: results =>
        Array.isArray(results)
            ? '{\n    view: \'list\',\n    item: \'struct\'\n}'
            : '{\n    view: \'struct\',\n    expanded: 1\n}',
    custom: results => viewModeSource.default(results)
};
const viewPresets = {
    table: () => '"table"'
};

function valueDescriptor(value) {
    if (Array.isArray(value)) {
        return `Array (${value.length ? `${value.length} ${value.length > 1 ? 'elements' : 'element'}` : 'empty'})`;
    }

    if (value && typeof value === 'object') {
        const keys = Object.keys(value);

        return `Object (${keys.length ? `${keys.length} ${keys.length > 1 ? 'keys' : 'key'}` : 'empty'})`;
    }

    return `Scalar (${value === 'null' ? 'null' : typeof value})`;
}

function encodeSearchParamPair(name, value) {
    return encodeURIComponent(name) + '=' + encodeURIComponent(value);
}

export function encodeParams(options) {
    const { query, view, title, dzen, extra } = options;
    const result = [];

    if (dzen) {
        result.push('dzen');
    }

    if (title) {
        result.push(encodeSearchParamPair('title', title));
    }

    if (query) {
        result.push(encodeSearchParamPair('q', base64.encode(query)));
    }

    if (view && typeof view === 'string') {
        result.push(encodeSearchParamPair('v', base64.encode(view)));
    } else {
        if (view === true) {
            result.push('v');
        }
    }

    if (extra) {
        Object.keys(extra).sort().forEach(name => {
            if (name !== 'query' && name !== 'view' && name !== 'title' && name !== 'dzen') {
                result.push(encodeSearchParamPair(name, extra[name]));
            }
        });
    }

    return result.join('&');
}

export function decodeParams(params) {
    const res = {
        title: params.title || '',
        query: base64.decode(params.q || ''),
        view: base64.decode(params.v || ''),
        mode: 'v' in params ? 'custom' : 'default',
        dzen: 'dzen' in params
    };

    Object.keys(params).forEach(name => {
        if (name !== 'q' && name !== 'v' && name !== 'title' && name !== 'dzen') {
            res[name] = params[name];
        }
    });

    return res;
}

export default function(discovery) {
    let showQueryRawData = false;
    let viewMode = '';
    let processEditorChangeEvent = true;
    let lastQuery = {};
    let lastView = {};

    function createPageQueryEditor(textarea) {
        const liveEdit = textarea.parentNode.querySelector('.live-update');
        const editor = CodeMirror.fromTextArea(textarea, {
            mode: 'javascript',
            theme: 'neo',
            indentUnit: 0
        });
        editor.on('change', () => processEditorChangeEvent && liveEdit.checked && applyQuery());
        return editor;
    }

    function applyQuery(newQuery, newView, newTitle) {
        const titleValue = titleInputEl.value;
        const queryValue = queryEditor.getValue();
        const viewValue = viewMode === 'custom' ? viewEditor.getValue() : undefined;

        if (newTitle === undefined) {
            newTitle = titleValue;
        }

        if (newQuery === undefined) {
            newQuery = queryValue;
        }

        if (newView === undefined) {
            newView = viewValue;
        }

        processEditorChangeEvent = false;

        if (titleValue !== newTitle) {
            titleInputEl.value = newTitle;
        }

        if (queryValue !== newQuery) {
            queryEditor.setValue(newQuery);
        }

        if (viewValue !== newView) {
            viewEditor.setValue(newView);
        }

        processEditorChangeEvent = true;

        // update params
        return discovery.setPageParams({
            ...discovery.pageParams,
            title: newTitle,
            query: newQuery,
            view: newView || viewMode === 'custom'
        }, true);
    }

    function updateAvailableViewList() {
        availableViewListEl.innerHTML = discovery.view.views
            .map(name => `<span class="view">${name}</span>`)
            .join(', ');
    }

    function updateViewModeTabs() {
        viewSetupEl.hidden = viewMode !== 'custom';
        viewModeTabsEls.forEach(el => {
            if (el.dataset.mode === viewMode) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    function setViewMode(mode) {
        if (viewMode === mode) {
            return;
        }

        switch (mode) {
            case 'default':
                viewMode = mode;
                applyQuery();
                break;

            case 'custom':
                viewMode = mode;
                applyQuery(undefined, viewModeSource[mode](lastView.data));
                break;

            default:
                console.log('Unknown view mode', mode);
        }

        updateViewModeTabs();
    }

    let titleInputEl;
    let dataDateTimeEl;
    let viewDateTimeEl;
    const headerEl = createElement('div', 'data-query-header', [
        createElement('button', {
            hidden: true,
            onclick: () => {
                const quote = s => s.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/'/g, '\\\'');
                let { title, query, view } = discovery.pageParams;
                const res = { title, query, view };

                window.currentReport = `{\n${Object.keys(res).map(k => res[k] ? `    ${k}: \'${quote(res[k])}\'` : false).filter(Boolean).join(',\n')}\n}`;
                console.log(window.currentReport);
            }
        }, 'as JSON'),

        createElement('div', { class: 'data-query-title', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                placeholder: 'Untitled report',
                oninput: () => applyQuery(),
                onkeypress: (e) => {
                    if (event.charCode === 13 || event.keyCode === 13) {
                        e.target.blur();
                    }
                }
            }),
            createElement('span', 'timestamp', [
                dataDateTimeEl = createElement('span'),
                viewDateTimeEl = createElement('span')
            ])
        ]),
        createElement('div', 'data-query-view-options', [
            createElement('button', {
                class: 'toggle-fullscreen',
                title: 'Toggle fullscreen mode',
                onclick: (e) => {
                    e.target.blur();
                    discovery.setPageParams({
                        ...discovery.pageParams,
                        dzen: !discovery.pageParams.dzen
                    });
                }
            }, 'Toggle fullscreen mode')
        ])
    ]);

    let queryEditorEl;
    const filterEl = createElement('div', 'filter', [
        queryEditorEl = createElement('textarea', {
            placeholder: 'Query'
        }),
        createElement('div', 'editor-toolbar', [
            createElement('span', 'syntax-hint',
                'Use <a href="https://github.com/lahmatiy/jora" target="_blank">jora</a> syntax for queries'
            ),
            createElement('label', null, [
                createElement('input', {
                    class: 'live-update',
                    type: 'checkbox',
                    checked: true,
                    onchange: (e) => {
                        if (e.target.checked) {
                            applyQuery();
                        }
                    }
                }),
                ' process on input'
            ]),
            createElement('div', 'buttons', [
                createElement('button', {
                    onclick: () => {
                        lastQuery = {};
                        applyQuery();
                        discovery.renderPage();
                    }
                }, 'Process')
            ])
        ])
    ]);

    const queryResultEl = createElement('div', 'data-query-result');

    let contentEl;
    let viewSetupEl;
    let viewEditorEl;
    let availableViewListEl;
    let viewModeTabsEls;
    const dataViewEl = createElement('div', 'data-view', [
        createElement('div', 'view-switcher', [
            createElement('div', 'tabs view-mode', viewModeTabsEls = Object.keys(viewModeSource).map(id =>
                createElement('div', {
                    class: 'tab',
                    'data-mode': id,
                    onclick: () => setViewMode(id)
                }, id)
            )),
            createElement('div', 'tabs presets', Object.keys(viewPresets).map(id =>
                createElement('div', {
                    class: 'tab',
                    onclick: () =>
                        discovery.setPageParams({
                            ...discovery.pageParams,
                            view: viewPresets[id](lastView.data)
                        })
                }, id)
            )),
            viewSetupEl = createElement('div', {
                class: 'query-view-setup',
                hidden: true
            }, [
                viewEditorEl = createElement('textarea', {
                    placeholder: 'View'
                }),
                createElement('div', 'editor-toolbar', [
                    createElement('div', 'editor-toolbar-view-dict', [
                        createText('Available views: '),
                        availableViewListEl = createElement('span', 'editor-toolbar-view-list')
                    ]),
                    createElement('label', null, [
                        createElement('input', {
                            class: 'live-update',
                            type: 'checkbox',
                            checked: true,
                            onchange: (e) => {
                                if (e.target.checked) {
                                    applyQuery();
                                }
                            }
                        }),
                        ' build on input'
                    ]),
                    createElement('div', 'buttons', [
                        createElement('button', {
                            onclick: () => {
                                lastView = {};
                                applyQuery();
                                discovery.renderPage();
                            }
                        }, 'Build')
                    ])
                ])
            ])
        ]),
        contentEl = createElement('div', 'content')
    ]);

    // FIXME: find a better way to update a view list
    updateAvailableViewList();
    const oldViewDefine = discovery.view.define;
    discovery.view.define = function(...args) {
        oldViewDefine.apply(this, args);
        updateAvailableViewList();
    };

    const queryEditor = createPageQueryEditor(queryEditorEl);
    const viewEditor = createPageQueryEditor(viewEditorEl);

    discovery.definePage('report', function(el, data, context) {
        let pageTitle = context.params.title;
        let pageQuery = context.params.query;
        let pageView = context.params.view;
        let queryTime;
        let view = null;
        let results = null;

        setViewMode(context.params.mode);

        if (applyQuery(pageQuery, pageView, pageTitle)) {
            return;
        }

        titleInputEl.parentNode.dataset.title = pageTitle || titleInputEl.placeholder;

        // zero timeout, like a setImmediate()
        Promise.resolve().then(() => {
            queryEditor.refresh();
            viewEditor.refresh();
        });

        if (lastQuery.data === data && lastQuery.query === pageQuery && lastQuery.context === context) {
            results = lastQuery.results;
        } else {
            try {
                queryTime = Date.now();
                results = discovery.query(pageQuery, data, context);
                queryTime = Date.now() - queryTime;
                dataViewEl.hidden = false;
            } catch (e) {
                lastQuery = {};
                queryResultEl.innerHTML = '<div class="error">' + escapeHtml(e.message) + '</div>';
                dataViewEl.hidden = true;
                return;
            }

            queryResultEl.innerHTML = '';
            dataDateTimeEl.innerText = context.createdAt && typeof context.createdAt.toLocaleString === 'function'
                ? 'Data collected at ' + context.createdAt.toLocaleString().replace(',', '') + ' | '
                : '';

            lastQuery = {
                data,
                query: pageQuery,
                context,
                results
            };

            discovery.view.render(queryResultEl, {
                view: 'expand',
                title: `html:"${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
                expanded: showQueryRawData,
                onToggle: state => showQueryRawData = state,
                content: { view: 'struct', expanded: 1 }
            }, results);
        }

        if (!pageView && viewMode === 'default') {
            pageView = viewModeSource[viewMode](results);
        }

        if (lastView.data !== results || lastView.view !== pageView) {
            contentEl.innerHTML = '';

            try {
                view = Function('return ' + (pageView ? '0,' + pageView : 'null'))();
                discovery.view.render(contentEl, view, results, context);
            } catch (e) {
                view = { view: 'fallback', reason: e.message };
                discovery.view.render(contentEl, el => {
                    el.innerHTML = '<div class="error">' + escapeHtml(String(e)) + '<br>(see details in console)</div>';
                    console.error(e);
                });
            }

            viewDateTimeEl.innerText = 'View built at ' + new Date().toLocaleString().replace(',', '');

            lastView = {
                data: results,
                view: pageView
            };
        }
    }, {
        reuseEl: true,
        init(el) {
            [
                headerEl,
                filterEl,
                queryResultEl,
                dataViewEl
            ].forEach(child => {
                el.appendChild(child);
            });
        },
        encodeParams,
        decodeParams
    });
}
