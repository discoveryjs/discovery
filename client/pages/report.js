/* eslint-env browser */

import * as base64 from '../core/utils/base64.js';
import { createElement, createText } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import copyText from '../core/utils/copy-text.js';

const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
const defaultViewPresets = [
    {
        name: 'Table',
        content: toFormattedViewSource({
            view: 'table'
        })
    },
    {
        name: 'Auto-link list',
        content: toFormattedViewSource({
            view: 'ol',
            item: 'auto-link'
        })
    },
    {
        name: 'Signature',
        content: toFormattedViewSource({
            view: 'signature',
            expanded: 2
        })
    }
];

function toFormattedViewSource(value) {
    return JSON
        .stringify(value, null, 4)
        .replace(/"((?:\\.|[^"])*)"(:?)/g,
            (_, content, colon) => colon && /^[a-z$_][a-z$_\d]*$/i.test(content)
                ? content + colon
                : `'${content.replace(/\\"/g, '"').replace(/'/g, '\\\'')}'` + colon
        );
}

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
    let lastQuery = {};
    let lastView = {};
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

    function updateParams(delta, replace) {
        return discovery.setPageParams({
            ...discovery.pageParams,
            ...delta
        }, replace);
    }

    function createPresetTab(name, content) {
        return createElement('div', {
            class: 'tab',
            onclick: () => updateParams({
                view: content // JSON.stringify(content, null, 4)
            })
        }, name || 'Untitled preset');
    }

    //
    // Header
    //
    let titleInputEl;
    let dataDateTimeEl;
    let viewDateTimeEl;
    let noeditToggleEl;
    const shareOptionsPopup = new discovery.view.Popup({
        render: (popupEl, _, hide) => discovery.view.render(popupEl, {
            view: 'menu',
            data: [
                { text: 'Copy link to report', action: () => copyText(location) },
                { text: 'Copy report as JSON', action: () => copyText(exportReportAsJson(discovery.pageParams)) }
            ],
            onClick(item) {
                hide();
                item.action();
            }
        })
    });
    const headerEl = createElement('div', 'report-header', [
        createElement('div', { class: 'report-header-text', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                placeholder: 'Untitled report',
                oninput: (e) => updateParams({
                    title: e.target.value
                }, true),
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
                onclick: ({ target }) => {
                    target.blur();
                    shareOptionsPopup.show(target);
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
    let queryLiveEditEl;
    const queryEditor = new discovery.view.QueryEditor(discovery).on('change', value =>
        queryLiveEditEl.checked && updateParams({ query: value }, true)
    );
    const queryEngineInfo = discovery.getQueryEngineInfo();
    const queryEditorFormEl = createElement('div', 'query-editor-form', [
        createElement('div', 'query-editor', [
            queryEditor.el,
            createElement('div', 'editor-toolbar', [
                createElement('span', 'syntax-hint',
                    `Use <a href="${queryEngineInfo.link}" target="_blank">${
                        queryEngineInfo.name
                    }</a> ${queryEngineInfo.version || ''} syntax for queries`
                ),
                createElement('label', null, [
                    queryLiveEditEl = createElement('input', {
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

    const queryEditorResultEl = createElement('div', 'data-query-result');

    //
    // View form
    //
    let viewSetupEl;
    let availableViewListEl;
    // let availablePresetListEl;
    let viewModeTabsEls;
    let viewLiveEditEl;
    const viewEditor = new discovery.view.ViewEditor(discovery).on('change', value =>
        viewLiveEditEl.checked && updateParams({ view: value }, true)
    );
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
        /* availablePresetListEl = */createElement('div', 'tabs presets', viewPresets.map(({ name, content }) =>
            createPresetTab(name, content)
        )),
        viewSetupEl = createElement('div', {
            class: 'view-editor',
            hidden: true
        }, [
            createElement('button', {
                class: 'view-button formatting',
                title: 'Prettify (input should be a JSON)',
                onclick() {
                    viewEditor.focus();

                    try {
                        const currentText = viewEditor.getValue().trim();
                        const json = new Function('return 0,' + currentText)();

                        updateParams({
                            view: toFormattedViewSource(json)
                        });
                    } catch (e) {
                        console.error('[Discovery] Prettify failed', e);
                    }
                }
            }),
            viewEditor.el,
            createElement('div', 'editor-toolbar', [
                createElement('div', 'editor-toolbar-view-dict', [
                    createText('Available views: '),
                    availableViewListEl = createElement('span', 'editor-toolbar-view-list')
                ]),
                createElement('label', null, [
                    viewLiveEditEl = createElement('input', {
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

    // sync view list
    const updateAvailableViewList = () =>
        availableViewListEl.innerHTML = discovery.view.names
            .map(name => `<span class="view">${name}</span>`)
            .join(', ');

    updateAvailableViewList();
    discovery.view.on('define', updateAvailableViewList);

    // sync view list
    // const updateAvailablePresetList = (name, preset) =>
    //     availablePresetListEl.appendChild(createPresetTab(name, preset.config));

    // discovery.preset.on('define', updateAvailablePresetList);

    //
    // Report form & content
    //
    const reportEditFormEl = createElement('div', { hidden: true }, [
        queryEditorFormEl,
        queryEditorResultEl,
        viewEditorFormEl
    ]);
    const reportContentEl = createElement('div', 'report-content');

    //
    // Page
    //
    discovery.page.define('report', function(el, data, context) {
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

        // update editors
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
