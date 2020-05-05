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
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

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
        placeholder: 'Discovery view definition...'
    })
        .on('change', value => liveEditEl.checked && updateContent(value));

    const availableViewListEl = createElement('span', { title: 'Click for details' });
    const liveEditEl = createElement('input', {
        type: 'checkbox',
        checked: true,
        onchange: (e) => {
            if (e.target.checked) {
                updateContent(editor.getValue());
            }
        }
    });
    const prettifyButtonEl = createElement('button', {
        class: 'formatting',
        title: 'Prettify (input should be a JSON)',
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
    });
    const toolbarEl = createElement('div', 'editor-toolbar', [
        createElement('div', 'view-list-hint', [availableViewListEl]),
        prettifyButtonEl,
        createElement('label', 'checkbox', [liveEditEl, ' perform on input'])
    ]);
    const editorWrapperEl = createElement('div', {
        class: 'view-editor-form-content',
        hidden: true
    }, [editor.el]);

    editor.el.appendChild(toolbarEl);
    container.appendChild(createElement('div', 'report-editor-tabs view-mode', viewModeTabsEls));
    container.appendChild(createElement('div', 'report-editor-tabs presets', presetsEls));
    container.appendChild(editorWrapperEl);

    // FIXME: temporary until full migration on discovery render
    discovery.view.render(toolbarEl, {
        view: 'button-primary',
        content: 'text:"Render"',
        onClick: () => {
            updateContent(editor.getValue(), true);
        }
    });

    // sync view list
    const updateAvailableViewList = () =>
        availableViewListEl.innerHTML = `Available ${discovery.view.names.length} views`;

    updateAvailableViewList();
    availableViewListEl.addEventListener('click', () => availableViewListPopup.toggle(availableViewListEl));
    discovery.view.on('define', updateAvailableViewList);

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

export default function(dom, discovery) {
    let editor = null;

    return function(source, data, context, { updateContent, editable }) {
        const viewMode = typeof source === 'string' ? 'custom' : 'default';

        // build a view
        if (!source && viewMode === 'default') {
            source = defaultViewSource;
        }

        if (editable) {
            if (editor === null) {
                editor = createEditor(dom.editorEl, discovery);
            }

            editor(source, data, context, updateContent, viewMode);
        }

        let config = Function('return ' + (source ? '0,' + source : 'null'))();

        dom.contentEl.innerHTML = '';
        discovery.view.render(dom.contentEl, config, data, context);
    };
}
