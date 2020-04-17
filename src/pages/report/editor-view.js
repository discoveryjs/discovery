import { createElement, createText } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';

export const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
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
    let availableViewListEl;
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
                            view: toFormattedViewSource(json)
                        });
                    } catch (e) {
                        console.error('[Discovery] Prettify failed', e);
                    }
                }
            }),
            viewEditor.el,
            createElement('div', 'editor-toolbar', [
                createElement('div', 'view-editor-view-list', [
                    createText('Available views: '),
                    availableViewListEl = createElement('span')
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

    // sync view list
    const updateAvailableViewList = () =>
        availableViewListEl.innerHTML = discovery.view.names
            .map(name => `<span class="item">${name}</span>`)
            .join(', ');

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
