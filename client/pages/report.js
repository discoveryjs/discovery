/* eslint-env browser */

import * as base64 from '../core/utils/base64.js';
import { createElement, createText } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import copyText from '../core/utils/copy-text.js';
import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local
import './report-hint.js';

const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
const defaultViewPresets = [
    { name: 'Table', content: '{\n    view: \'table\'\n}' },
    { name: 'Autolink list', content: '{\n    view: \'ol\',\n    item: \'auto-link\'\n}' }
];

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

function ensureString(value, fallback) {
    return typeof value === 'string' ? value : fallback || '';
}

function encodeParams(params) {
    const specialParams = ['query', 'view', 'title', 'dzen', 'noedit'];
    const { query, view, title, dzen, noedit, extra } = typeof params === 'string' ? { query: params } : params;
    const parts = [];

    if (dzen) {
        parts.push('dzen');
    }

    if (noedit) {
        parts.push('noedit');
    }

    if (title) {
        parts.push(encodeSearchParamPair('title', title));
    }

    if (query) {
        parts.push(encodeSearchParamPair('q', base64.encode(query)));
    }

    if (typeof view === 'string') {
        parts.push(view ? encodeSearchParamPair('v', base64.encode(view)) : 'v');
    }

    Object.keys(extra || {}).sort().forEach(name => {
        if (!specialParams.includes(name)) {
            parts.push(encodeSearchParamPair(name, extra[name]));
        }
    });

    return parts.join('&');
}

function decodeParams(params) {
    const specialParams = ['q', 'v', 'title', 'dzen', 'noedit'];
    const decodedParams = {
        title: params.title || '',
        query: base64.decode(ensureString(params.q, '')),
        view: 'v' in params ? base64.decode(ensureString(params.v, '')) : undefined,
        dzen: 'dzen' in params,
        noedit: 'noedit' in params
    };

    Object.keys(params).forEach(name => {
        if (!specialParams.includes(name)) {
            decodedParams[name] = params[name];
        }
    });

    return decodedParams;
}

function exportReportAsJson(pageParams) {
    const quote = s => s.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/'/g, '\\\'');
    let { title, query, view } = pageParams;
    const res = { title, query, view };

    return `{\n${
        Object.keys(res).reduce(
            (props, k) => props.concat(res[k] ? `    ${k}: \'${quote(res[k])}\'` : []),
            []
        ).join(',\n')
    }\n}`;
}

export default function(discovery) {
    let expandQueryResults = false;
    let expandReportInputData = false;
    let reportInputData = NaN;
    let currentData;
    let currentContext;
    let lastQuery = {};
    let lastView = {};
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

    function renderQueryAutocompleteItem(el, self, { entry: { value, current, type }}) {
        const startChar = current[0];
        const lastChar = current[current.length - 1];
        const start = startChar === '"' || startChar === "'" ? 1 : 0;
        const end = lastChar === '"' || lastChar === "'" ? 1 : 0;
        const pattern = current.toLowerCase().substring(start, current.length - end);
        const offset = pattern ? value.toLowerCase().indexOf(pattern, value[0] === '"' || value[0] === "'" ? 1 : 0) : -1;

        el.appendChild(createElement('span', 'name',
            offset === -1
                ? value
                : escapeHtml(value.substring(0, offset)) +
                  '<span class="match">' + escapeHtml(value.substr(offset, pattern.length)) + '</span>' +
                  escapeHtml(value.substr(offset + pattern.length))
        ));
        el.appendChild(createElement('span', 'type', type));
    }

    function autocompleteQuery(cm) {
        const cursor = cm.getCursor();
        const suggestions = discovery.querySuggestions(
            cm.getValue(),
            cm.doc.indexFromPos(cursor),
            currentData,
            currentContext
        );

        if (!suggestions) {
            return;
        }

        return {
            list: suggestions.slice(0, 50).map(entry => {
                return {
                    entry,
                    text: entry.value,
                    render: renderQueryAutocompleteItem,
                    from: cm.posFromIndex(entry.from),
                    to: cm.posFromIndex(entry.to)
                };
            })
        };
    }

    function createEditor(textarea, onChange, autocomplete) {
        const liveEdit = textarea.parentNode.querySelector('.live-update');
        const editor = CodeMirror.fromTextArea(textarea, {
            extraKeys: { 'Alt-Space': 'autocomplete' },
            mode: 'javascript',
            theme: 'neo',
            indentUnit: 0,
            hintOptions: autocomplete && {
                hint: autocomplete,
                completeSingle: false,
                closeOnUnfocus: true
            }
        });

        const setValue = editor.setValue;
        editor.setValue = function(newValue) {
            Promise.resolve().then(() => this.refresh()); // zero timeout, like a setImmediate()
            if (typeof newValue === 'string' && this.getValue() !== newValue) {
                setValue.call(this, newValue || '');
            }
        };

        editor.on('change', () => liveEdit.checked && onChange(editor.getValue()));

        if (autocomplete) {
            // patch prepareSelection to inject a context hint
            // const ps = editor.display.input.prepareSelection;
            // editor.display.input.prepareSelection = function(...args) {
            //     const selection = ps.apply(this, args);
            //     if (selection.cursors.firstChild) {
            //         selection.cursors.firstChild.appendChild(createElement('div', 'context-hint', 'asd'));
            //     }
            //     return selection;
            // };

            editor.on('cursorActivity', editor => editor.state.focused && editor.showHint(autocomplete));
            editor.on('focus', editor => editor.showHint(autocomplete));
        }

        return editor;
    }

    function updateParams(delta, replace) {
        return discovery.setPageParams({
            ...discovery.pageParams,
            ...delta
        }, replace);
    }

    function updateAvailableViewList() {
        availableViewListEl.innerHTML = discovery.view.names
            .map(name => `<span class="view">${name}</span>`)
            .join(', ');
    }

    //
    // Header
    //
    let titleInputEl;
    let dataDateTimeEl;
    let viewDateTimeEl;
    let noeditToggleEl;
    const shareOptionsPopup = new discovery.view.Popup();
    const headerEl = createElement('div', 'report-header', [
        createElement('div', { class: 'report-header-text', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                placeholder: 'Untitled report',
                oninput: (e) => updateParams({
                    title: e.target.value
                }),
                onkeypress: (e) => {
                    if (event.charCode === 13 || event.keyCode === 13) {
                        e.target.blur();
                    }
                }
            }),
            createElement('span', 'timestamp', [
                dataDateTimeEl = createElement('span', null, '&nbsp;'),
                viewDateTimeEl = createElement('span')
            ])
        ]),
        createElement('div', 'data-query-view-options', [
            noeditToggleEl = createElement('button', {
                class: 'edit-mode',
                title: 'Toggle edit mode',
                onclick: (e) => {
                    e.target.blur();
                    updateParams({
                        noedit: !discovery.pageParams.noedit
                    });
                }
            }),
            createElement('button', {
                class: 'share',
                title: 'Share ...',
                onclick: (e) => {
                    e.target.blur();
                    shareOptionsPopup.show(e.target, {
                        xAnchor: 'right',
                        render: (popupEl) => {
                            discovery.view.render(popupEl, {
                                view: 'menu',
                                data: [
                                    { text: 'Copy link to report', action: () => copyText(location) },
                                    { text: 'Copy report as JSON', action: () => copyText(exportReportAsJson(discovery.pageParams)) }
                                ],
                                onClick(item) {
                                    shareOptionsPopup.hide();
                                    item.action();
                                }
                            });
                        }
                    });
                }
            }),
            createElement('button', {
                class: 'toggle-fullscreen',
                title: 'Toggle fullscreen mode',
                onclick: (e) => {
                    e.target.blur();
                    updateParams({
                        dzen: !discovery.pageParams.dzen
                    });
                }
            })
        ])
    ]);

    //
    // Query form
    //
    let queryEditorEl;
    const queryEngineInfo = discovery.getQueryEngineInfo();
    const queryEditorFormEl = createElement('div', 'query-editor-form', [
        createElement('div', 'query-editor', [
            queryEditorEl = createElement('textarea', {
                placeholder: 'Query'
            }),
            createElement('div', 'editor-toolbar', [
                createElement('span', 'syntax-hint',
                    `Use <a href="${queryEngineInfo.link}" target="_blank">${
                        queryEngineInfo.name
                    }</a> ${queryEngineInfo.version || ''} syntax for queries`
                ),
                createElement('label', null, [
                    createElement('input', {
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
                    ' process on input'
                ]),
                createElement('div', 'buttons', [
                    createElement('button', {
                        onclick: () => {
                            lastQuery = {};
                            updateParams({
                                query: queryEditor.getValue()
                            }, true);
                            discovery.scheduleRender('page'); // force render
                        }
                    }, 'Process')
                ])
            ])
        ])
    ]);

    const reportInputDataEl = createElement('div', 'data-query-result');
    const queryEditorResultEl = createElement('div', 'data-query-result');

    //
    // View form
    //
    let viewSetupEl;
    let viewEditorEl;
    let availableViewListEl;
    let viewModeTabsEls;
    const viewEditorFormEl = createElement('div', 'view-editor-form', [
        createElement('div', 'tabs view-mode', viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
            createElement('div', {
                class: 'tab',
                'data-mode': viewMode.toLowerCase(),
                onclick: () => updateParams({
                    view: viewMode === 'Default' ? undefined : defaultViewSource
                }, true)
            }, viewMode)
        )),
        createElement('div', 'tabs presets', viewPresets.map(({ name, content }) =>
            createElement('div', {
                class: 'tab',
                onclick: () => updateParams({
                    view: content
                })
            }, name || 'Untitled preset')
        )),
        viewSetupEl = createElement('div', {
            class: 'view-editor',
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
                                updateParams({ view: viewEditor.getValue() }, true);
                            }
                        }
                    }),
                    ' build on input'
                ]),
                createElement('div', 'buttons', [
                    createElement('button', {
                        onclick: () => {
                            lastView = {};
                            updateParams({ view: viewEditor.getValue() }, true);
                            discovery.scheduleRender('page'); // force render
                        }
                    }, 'Build')
                ])
            ])
        ])
    ]);

    const reportEditFormEl = createElement('div', { hidden: true }, [
        // reportInputDataEl,
        queryEditorFormEl,
        queryEditorResultEl,
        viewEditorFormEl
    ]);
    const reportContentEl = createElement('div', 'report-content');

    // FIXME: find a better way to update a view list
    updateAvailableViewList();
    const oldViewDefine = discovery.view.define;
    discovery.view.define = function(...args) {
        oldViewDefine.apply(this, args);
        updateAvailableViewList();
    };

    //
    // Editors
    //
    const queryEditor = createEditor(
        queryEditorEl,
        value => updateParams({ query: value }, true),
        autocompleteQuery
    );
    const viewEditor = createEditor(
        viewEditorEl,
        value => updateParams({ view: value }, true)
    );

    //
    // Page
    //
    discovery.definePage('report', function(el, data, context) {
        const viewMode = typeof context.params.view === 'string' ? 'custom' : 'default';
        let pageTitle = context.params.title;
        let pageQuery = context.params.query;
        let pageView = context.params.view;
        let queryTime;
        let view = null;
        let results = null;

        // process noedit setting
        reportEditFormEl.hidden = context.params.noedit;
        noeditToggleEl.classList.toggle('disabled', context.params.noedit);

        // update report title
        titleInputEl.parentNode.dataset.title = pageTitle || titleInputEl.placeholder;
        titleInputEl.value = pageTitle;
        dataDateTimeEl.innerText = context.createdAt && typeof context.createdAt.toLocaleString === 'function'
            ? 'Data collected at ' + context.createdAt.toLocaleString().replace(',', '') + ' | '
            : '';

        if (reportInputData !== data) {
            reportInputData = data;
            discovery.view.render(reportInputDataEl, {
                view: 'expand',
                title: `text:"${valueDescriptor(data)}"`,
                expanded: expandReportInputData,
                onToggle: state => expandReportInputData = state,
                content: { view: 'struct', expanded: 1 }
            }, data);
        }

        // update editors
        currentData = data;        // uses for autocomplete
        currentContext = context;  // uses for autocomplete
        queryEditor.setValue(pageQuery);
        viewEditor.setValue(pageView);

        // perform data query
        if (lastQuery.data === data && lastQuery.query === pageQuery && lastQuery.context === context) {
            results = lastQuery.results;
        } else {
            try {
                queryTime = Date.now();
                results = discovery.query(pageQuery, data, context);
                queryTime = Date.now() - queryTime;
                viewEditorFormEl.hidden = false;
                reportContentEl.hidden = false;
            } catch (e) {
                lastQuery = {};
                queryEditorResultEl.innerHTML = '<div class="error">' + escapeHtml(e.message) + '</div>';
                viewEditorFormEl.hidden = true;
                reportContentEl.hidden = true;
                return;
            }

            queryEditorResultEl.innerHTML = '';

            lastQuery = {
                data,
                query: pageQuery,
                context,
                results
            };

            discovery.view.render(queryEditorResultEl, {
                view: 'expand',
                title: `text:"${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
                expanded: expandQueryResults,
                onToggle: state => expandQueryResults = state,
                content: { view: 'struct', expanded: 1 }
            }, results);
        }

        // update view form
        viewSetupEl.hidden = viewMode !== 'custom';
        viewModeTabsEls.forEach(el =>
            el.classList.toggle('active', el.dataset.mode === viewMode)
        );

        // build a view
        if (!pageView && viewMode === 'default') {
            pageView = defaultViewSource;
        }

        if (lastView.data !== results || lastView.view !== pageView) {
            reportContentEl.innerHTML = '';

            try {
                view = Function('return ' + (pageView ? '0,' + pageView : 'null'))();
                discovery.view.render(reportContentEl, view, results, context);
            } catch (e) {
                view = { view: 'fallback', reason: e.message };
                discovery.view.render(reportContentEl, el => {
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
                reportEditFormEl,
                reportContentEl
            ].forEach(child => {
                el.appendChild(child);
            });
        },
        encodeParams,
        decodeParams
    });
}
