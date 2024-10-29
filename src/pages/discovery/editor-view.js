import { debounce } from '../../core/utils/debounce.js';
import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { jsonStringifyAsJavaScript }  from '../../core/utils/json.js';
import { contextWithoutEditorParams } from './params.js';
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
        class: 'discovery-editor-tab',
        onclick: () => updateParams({
            view: content // JSON.stringify(content, null, 4)
        })
    }, name || 'Untitled preset');
}

export default function(host, updateParams) {
    const viewPresets = defaultViewPresets;
    let lastView = {};

    let viewSetupEl;
    let availableViewsEl;
    let availableViewsTextEl;
    let availableViewsListEl;
    // let availablePresetListEl;
    let viewModeTabsEls;
    let viewLiveEditEl;
    const viewEditor = new host.view.ViewEditor(host).on('change', value =>
        viewLiveEditEl.checked && updateParams({ view: value }, true)
    );
    const viewEditorButtonsEl = createElement('div', 'buttons');
    const viewEditorFormEl = createElement('div', 'form view-editor-form', [
        createElement('div', 'view-editor-form-header', [
            createElement('div', 'discovery-editor-tabs view-mode', viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
                createElement('div', {
                    class: 'discovery-editor-tab',
                    'data-mode': viewMode.toLowerCase(),
                    onclick: () => updateParams({
                        view: viewMode === 'Default' ? undefined : defaultViewSource
                    }, true)
                }, viewMode)
            )),
            /* availablePresetListEl = */createElement('div', 'discovery-editor-tabs presets', viewPresets.map(({ name, content }) =>
                createPresetTab(name, content, updateParams)
            )),
            createElement('div', 'view-editor-form-header-links', '<a href="#views-showcase" class="view-link">Views showcase</a>')
        ]),
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
                        host.log('error', 'View editor prettify failed:', e);
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
                        availableViewsTextEl = createElement('div', 'header-content'),
                        createElement('div', 'trigger')
                    ]),
                    availableViewsListEl = createElement('div', 'view-editor-view-list')
                ]),
                createElement('label', 'view-checkbox', [
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
                    createElement('span', 'view-checkbox__label', 'build on input')
                ]),
                viewEditorButtonsEl
            ])
        ])
    ]);

    // FIXME: temporary until full migration on discovery render
    host.view.render(viewEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Build"',
        onClick: () => {
            lastView = {};
            updateParams({
                view: viewEditor.getValue()
            }, true);
            host.scheduleRender('page'); // force render
        }
    });
    new host.view.Popup({
        className: 'view-editor-view-list-hint',
        hoverTriggers: '.view-editor-view-list .item.with-usage',
        // hoverPin: 'trigger-click',
        render: function(popupEl, triggerEl) {
            host.view.render(popupEl, renderUsage(host), host.view.get(triggerEl.textContent), {});
        }
    });

    // sync view list
    availableViewsTextEl.textContent = `Available ${[...host.view.entries].filter(([, view]) => view.options.usage).length} views`;
    const updateAvailableViewList = () =>
        availableViewsListEl.innerHTML =
            '<a href="#views-showcase" class="view-link">Views showcase</a><br><br>' +
            [...host.view.entries].sort()
                .map(([name, view]) => `<div><a class="item view-link${view.options.usage ? ' with-usage' : ''}" ${view.options.usage ? 'href="#views-showcase:' + name + '"' : ''}>${name}</a></div>`)
                .join('');

    updateAvailableViewList();
    host.view.on('define', debounce(updateAvailableViewList, 100));

    // sync view list
    // const updateAvailablePresetList = (name, preset) =>
    //     availablePresetListEl.appendChild(createPresetTab(name, preset.config, updateParams));

    // discovery.preset.on('define', updateAvailablePresetList);

    return {
        el: viewEditorFormEl,
        render(data, context, discoveryContentEl) {
            const viewContext = contextWithoutEditorParams(context, lastView.context);
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

            if (lastView.view !== pageView || lastView.data !== data || lastView.context !== viewContext) {
                discoveryContentEl.innerHTML = '';

                try {
                    view = Function('return ' + (pageView ? '0,' + pageView : 'null'))();
                    host.view.render(discoveryContentEl, view, data, viewContext);
                } catch (e) {
                    host.view.render(discoveryContentEl, el => {
                        el.className = 'discovery-error render-error';
                        el.innerHTML = escapeHtml(String(e)) + '<br>(see details in console)';
                        host.log('error', e);
                    });
                }

                lastView = {
                    data,
                    context: viewContext,
                    view: pageView
                };
            }
        }
    };
}
