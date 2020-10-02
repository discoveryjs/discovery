import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { jsonStringifyAsJavaScript }  from '../../core/utils/json.js';
import renderUsage from '../../views/_usage.js';

export const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
const defaultViewPresets = [
    {
        name: 'Table',
        content: jsonStringifyAsJavaScript({
            view: 'table'
        })
    },
    {
        name: 'Auto-link list',
        content: jsonStringifyAsJavaScript({
            view: 'ol',
            item: 'auto-link'
        })
    },
    {
        name: 'Signature',
        content: jsonStringifyAsJavaScript({
            view: 'signature',
            expanded: 2
        })
    }
];

function createPresetTab(name, content, updateParams) {
    return createElement('div', {
        class: 'report-editor-tab',
        onclick: () => updateParams({
            view: content // JSON.stringify(content, null, 4)
        })
    }, name || 'Untitled preset');
}

export default function(discovery, updateParams) {
    let lastView = {};
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

    let viewSetupEl;
    let availableViewsEl;
    let availableViewsTextEl;
    let availableViewsListEl;
    // let availablePresetListEl;
    let viewModeTabsEls;
    let viewLiveEditEl;
    const viewEditor = new discovery.view.ViewEditor(discovery).on('change', value =>
        viewLiveEditEl.checked && updateParams({ view: value }, true)
    );
    const viewEditorButtonsEl = createElement('div', 'buttons');
    const viewEditorFormEl = createElement('div', 'form view-editor-form', [
        createElement('div', 'report-editor-tabs view-mode', viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
            createElement('div', {
                class: 'report-editor-tab',
                'data-mode': viewMode.toLowerCase(),
                onclick: () => updateParams({
                    view: viewMode === 'Default' ? undefined : defaultViewSource
                }, true)
            }, viewMode)
        )),
        /* availablePresetListEl = */createElement('div', 'report-editor-tabs presets', viewPresets.map(({ name, content }) =>
            createPresetTab(name, content, updateParams)
        )),
        viewSetupEl = createElement('div', {
            class: 'view-editor-form-content',
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
                            view: jsonStringifyAsJavaScript(json)
                        });
                    } catch (e) {
                        console.error('[Discovery] Prettify failed', e);
                    }
                }
            }),
            viewEditor.el,
            createElement('div', 'editor-toolbar', [
                availableViewsEl = createElement('div', 'view-expand', [
                    createElement('div', {
                        class: 'header',
                        onclick: () => {
                            availableViewsEl.classList.toggle('expanded');
                            availableViewsListEl.classList.toggle('visible');
                        }
                    }, [
                        availableViewsTextEl = createElement('div', 'Available views:'),
                        createElement('div', 'trigger')
                    ]),
                    availableViewsListEl = createElement('div', 'view-editor-view-list')
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
                viewEditorButtonsEl
            ])
        ])
    ]);

    // FIXME: temporary until full migration on discovery render
    discovery.view.render(viewEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Build"',
        onClick: () => {
            lastView = {};
            updateParams({
                view: viewEditor.getValue()
            }, true);
            discovery.scheduleRender('page'); // force render
        }
    });
    new discovery.view.Popup({
        className: 'view-editor-view-list-hint',
        hoverTriggers: '.view-editor-view-list .item.with-usage',
        // hoverPin: 'trigger-click',
        render: function(popupEl, triggerEl) {
            discovery.view.render(popupEl, renderUsage(discovery), discovery.view.get(triggerEl.textContent), {});
        }
    });

    // sync view list
    availableViewsTextEl.textContent = `Available ${[...discovery.view.entries].filter(([, view]) => view.options.usage).length} views`;
    const updateAvailableViewList = () =>
        availableViewsListEl.innerHTML =
            '<a href="#views-showcase" class="view-link">Views showcase</a><br><br>' +
            [...discovery.view.entries].sort()
                .map(([name, view]) => `<div><a class="item view-link${view.options.usage ? ' with-usage' : ''}" ${view.options.usage ? 'href="#views-showcase:' + name + '"' : ''}>${name}</a></div>`)
                .join('');

    updateAvailableViewList();
    discovery.view.on('define', updateAvailableViewList);

    // sync view list
    // const updateAvailablePresetList = (name, preset) =>
    //     availablePresetListEl.appendChild(createPresetTab(name, preset.config, updateParams));

    // discovery.preset.on('define', updateAvailablePresetList);

    return {
        el: viewEditorFormEl,
        render(data, context, reportContentEl) {
            const viewMode = typeof context.params.view === 'string' ? 'custom' : 'default';
            let pageView = context.params.view;
            let view = null;

            // update editors
            viewEditor.setValue(pageView);

            // update view form
            viewSetupEl.hidden = viewMode !== 'custom';
            viewModeTabsEls.forEach(el =>
                el.classList.toggle('active', el.dataset.mode === viewMode)
            );

            // build a view
            if (!pageView && viewMode === 'default') {
                pageView = defaultViewSource;
            }

            if (lastView.data !== data || lastView.view !== pageView) {
                reportContentEl.innerHTML = '';

                try {
                    view = Function('return ' + (pageView ? '0,' + pageView : 'null'))();
                    discovery.view.render(reportContentEl, view, data, context);
                } catch (e) {
                    discovery.view.render(reportContentEl, el => {
                        el.className = 'report-error render-error';
                        el.innerHTML = escapeHtml(String(e)) + '<br>(see details in console)';
                        console.error(e);
                    });
                }

                lastView = {
                    data: data,
                    view: pageView
                };
            }
        }
    };
}
