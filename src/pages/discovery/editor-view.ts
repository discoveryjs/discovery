import type { ViewModel } from '../../lib.js';
import type { ViewEditor } from '../../views/editor/editors.js';
import type { UpdateHostParams } from './types.js';
import { debounce } from '../../core/utils/debounce.js';
import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { jsonStringifyAsJavaScript }  from '../../core/utils/json.js';
import { contextWithoutEditorParams, getParamsFromContext } from './params.js';
import { getUsageRenderConfig } from '../views-showcase/view-usage-render.js';

type ViewPreset = {
    name: string;
    content: string;
};

export const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
const defaultViewPresets: ViewPreset[] = [
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

function createPresetTab(name: string, content: string, updateParams: UpdateHostParams) {
    return createElement('div', {
        class: 'discovery-editor-tab',
        onclick: () => updateParams({
            view: content // JSON.stringify(content, null, 4)
        })
    }, name || 'Untitled preset');
}

export default function(host: ViewModel, updateParams: UpdateHostParams) {
    const ViewEditorClass = (host.view as any).ViewEditor as typeof ViewEditor;
    const viewPresets = defaultViewPresets;
    let lastView: Partial<{
        data: unknown;
        context: unknown;
        view: string | undefined;
    }> = {};

    let availableViewsEl: HTMLElement;
    let availableViewsTextEl: HTMLElement;
    let availableViewsListEl: HTMLElement;
    // let availablePresetListEl;
    let viewModeTabsEls: HTMLElement[];
    let viewLiveEditEl: HTMLInputElement;
    const viewEditor = new ViewEditorClass().on('change', value =>
        viewLiveEditEl.checked && updateParams({ view: value }, true)
    );
    const viewEditorButtonsEl = createElement('div', 'buttons');
    const viewEditorFormEl = createElement('div', 'form view-editor-form', [
        createElement('div', 'view-editor-form-header', [
            createElement('div', 'discovery-editor-tabs view-mode', viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
                createElement('div', {
                    class: 'discovery-editor-tab',
                    'data-mode': viewMode.toLowerCase(),
                    onclick() {
                        if (!this.classList.contains('active')) {
                            updateParams({
                                view: viewMode === 'Default' ? undefined : defaultViewSource,
                                viewEditorHidden: false
                            }, true);
                        } else {
                            updateParams({
                                viewEditorHidden: !viewEditorFormEl.classList.contains('hide-editor')
                            }, true);
                        }
                    }
                }, viewMode === 'Custom'
                    ? [viewMode, createElement('span', 'show-view-editor-toggle')]
                    : viewMode
                )
            )),
            /* availablePresetListEl = */createElement('div', 'discovery-editor-tabs presets', viewPresets.map(({ name, content }) =>
                createPresetTab(name, content, updateParams)
            )),
            createElement('div', 'view-editor-form-header-links', '<a href="#views-showcase" class="view-link">Views showcase</a>')
        ]),
        createElement('div', 'view-editor-form-content', [
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
                        host.logger.error('View editor prettify failed:', e);
                    }
                }
            }),
            viewEditor.el,
            createElement('div', 'editor-toolbar', [
                availableViewsEl = createElement('div', 'view-expand', [
                    createElement('div', {
                        class: 'header',
                        onclick() {
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
                        onchange() {
                            if (this.checked) {
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
        onClick() {
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
        render(popupEl, triggerEl) {
            host.view.render(
                popupEl,
                getUsageRenderConfig(host),
                host.view.get(triggerEl?.textContent as string),
                {}
            );
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
        render(data: unknown, context: unknown, discoveryContentEl: HTMLElement) {
            const viewContext = contextWithoutEditorParams(context, lastView.context);
            const params = getParamsFromContext(context);
            const viewMode = typeof params.view === 'string' ? 'custom' : 'default';
            const viewEditorHidden = viewMode === 'default' || params.viewEditorHidden === true;
            let pageView = params.view;
            let view = null;

            // update editor
            viewEditor.setValue(pageView);

            // update view form
            viewEditorFormEl.classList.toggle('hide-editor', viewEditorHidden);
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
                    host.view.render(discoveryContentEl, view as any, data, viewContext);
                } catch (e) {
                    host.view.render(discoveryContentEl, (el: HTMLElement) => {
                        el.className = 'discovery-error render-error';
                        el.innerHTML = escapeHtml(String(e)) + '<br>(see details in console)';
                        host.logger.error(e);
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
