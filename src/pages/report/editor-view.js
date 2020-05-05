import { createElement } from '../../core/utils/dom.js';

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

function createPresetTab(name, content, updateContent) {
    return createElement('div', {
        class: 'report-editor-tab',
        onclick: () => updateContent(content) // JSON.stringify(content, null, 4)
    }, name || 'Untitled preset');
}

function createEditor(container, discovery) {
    let updateContent = () => {};
    let liveUpdate = true;
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

    const viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
        createElement('div', {
            class: 'report-editor-tab',
            'data-mode': viewMode.toLowerCase(),
            onclick: () => updateContent(viewMode === 'Default' ? undefined : defaultViewSource)
        }, viewMode)
    );
    const presetsEls = viewPresets.map(({ name, content }) =>
        createPresetTab(name, content, (...args) => updateContent(...args))
    );

    const editor = new discovery.view.ViewEditor({
        placeholder: 'Discovery view definition...',
        extraKeys: { 'Cmd-Enter': () => updateContent(editor.getValue()) }
    })
        .on('change', value => liveUpdate && updateContent(value));

    const performButtonEl = createElement('span', {
        class: 'perform-button disabled',
        onclick: () => updateContent(editor.getValue(), true)
    }, 'Render (Cmd+Enter)');
    const toolbarEl = createElement('div', 'editor-toolbar', [
        performButtonEl,
        createElement('span', {
            class: 'toggle-button live-update-button',
            title: 'Perform on editing (live update)',
            onclick: ({ target }) => {
                liveUpdate = !liveUpdate;
                target.classList.toggle('disabled', !liveUpdate);
                performButtonEl.classList.toggle('disabled', liveUpdate);

                if (liveUpdate) {
                    updateContent(editor.getValue());
                }
            }
        }),
        createElement('span', {
            class: 'toggle-button formatting-button',
            title: 'Prettify (input should be a valid JSON)',
            onclick() {
                editor.focus();

                try {
                    const currentText = editor.getValue().trim();
                    const json = new Function('return 0,' + currentText)();

                    updateContent(toFormattedViewSource(json));
                } catch (e) {
                    console.error('[Discovery] Prettify failed', e);
                }
            }
        })
    ]);

    const editorWrapperEl = createElement('div', {
        class: 'view-editor-form-content',
        hidden: true
    }, [editor.el]);

    editor.el.appendChild(toolbarEl);
    container.appendChild(createElement('div', 'report-editor-tabs view-mode', viewModeTabsEls));
    container.appendChild(createElement('div', 'report-editor-tabs presets', presetsEls));
    container.appendChild(editorWrapperEl);

    return (content, _data, _context, _updateContent, viewMode) => {
        updateContent = _updateContent;

        // update editor content
        if (viewMode === 'custom') {
            editor.setValue(content);
        }

        // update view form
        editorWrapperEl.hidden = viewMode !== 'custom';
        viewModeTabsEls.forEach(el =>
            el.classList.toggle('active', el.dataset.mode === viewMode)
        );
    };
}

export default function(discovery, { editorEl, contentEl }) {
    let editor = null;

    return {
        renderHelp(el) {
            const availableViewListEl = createElement('span', {
                title: 'Click for details',
                onclick() {
                    availableViewListPopup.toggle(availableViewListEl);
                }
            });

            // view popup
            const availableViewListPopup = new discovery.view.Popup({
                render(el) {
                    discovery.view.render(el, {
                        view: 'menu',
                        data: '.({ name: pick(), type: pick(1).options.type }).sort(name asc)',
                        limit: false,
                        item: [
                            'text:name + " "',
                            {
                                view: 'badge',
                                when: 'type = "model"',
                                data: '{ text: "model" }'
                            }
                        ]
                    }, discovery.view.entries);
                }
            });

            // sync view list
            const updateAvailableViewList = () =>
                availableViewListEl.innerHTML = `Available ${discovery.view.names.length} views`;
            updateAvailableViewList();
            discovery.view.on('define', updateAvailableViewList);

            el.append(availableViewListEl);
        },
        process: function(source, data, context, { updateContent, editable }) {
            const viewMode = typeof source === 'string' ? 'custom' : 'default';

            // build a view
            if (!source && viewMode === 'default') {
                source = defaultViewSource;
            }

            if (editable) {
                if (editor === null) {
                    editor = createEditor(editorEl, discovery);
                }

                editor(source, data, context, updateContent, viewMode);
            }

            let config = Function('return ' + (source ? '0,' + source : 'null'))();

            contentEl.innerHTML = '';
            discovery.view.render(contentEl, config, data, context);
        }
    };
}
