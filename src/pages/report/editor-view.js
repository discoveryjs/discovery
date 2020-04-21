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

    const availableViewListEl = createElement('span');
    const viewLiveEditEl = createElement('input', {
        class: 'live-update',
        type: 'checkbox',
        checked: true,
        onchange: (e) => {
            if (e.target.checked) {
                updateContent(viewEditor.getValue());
            }
        }
    });
    const viewEditor = new discovery.view.ViewEditor(discovery).on('change', value =>
        viewLiveEditEl.checked && updateContent(value)
    );
    const viewEditorButtonsEl = createElement('div', 'buttons');
    const viewModeTabsEls = ['Default', 'Custom'].map(viewMode =>
        createElement('div', {
            class: 'report-editor-tab',
            'data-mode': viewMode.toLowerCase(),
            onclick: () => updateContent(viewMode === 'Default' ? undefined : defaultViewSource)
        }, viewMode)
    );
    const viewPresetsEls = viewPresets.map(({ name, content }) =>
        createPresetTab(name, content, (...args) => updateContent(...args))
    );
    const viewSetupEl = createElement('div', {
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

                    updateContent(toFormattedViewSource(json));
                } catch (e) {
                    console.error('[Discovery] Prettify failed', e);
                }
            }
        }),
        viewEditor.el,
        createElement('div', 'editor-toolbar', [
            createElement('div', 'view-editor-view-list', [createText('Available views: '), availableViewListEl]),
            createElement('label', null, [viewLiveEditEl, ' build on input']),
            viewEditorButtonsEl
        ])
    ]);

    container.appendChild(createElement('div', 'report-editor-tabs view-mode', viewModeTabsEls));
    container.appendChild(createElement('div', 'report-editor-tabs presets', viewPresetsEls));
    container.appendChild(viewSetupEl);

    // FIXME: temporary until full migration on discovery render
    discovery.view.render(viewEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Build"',
        onClick: () => {
            updateContent(viewEditor.getValue(), true);
        }
    });

    // sync view list
    const updateAvailableViewList = () =>
        availableViewListEl.innerHTML = discovery.view.names
            .map(name => `<span class="item">${name}</span>`)
            .join(', ');

    updateAvailableViewList();
    discovery.view.on('define', updateAvailableViewList);

    return (content, _data, _context, _updateContent, viewMode) => {
        updateContent = _updateContent;

        // update editor content
        if (viewMode === 'custom') {
            viewEditor.setValue(content);
        }

        // update view form
        viewSetupEl.hidden = viewMode !== 'custom';
        viewModeTabsEls.forEach(el =>
            el.classList.toggle('active', el.dataset.mode === viewMode)
        );
    };
}

export default function(dom, discovery) {
    let editor = null;

    return function(source, data, context, updateContent) {
        const viewMode = typeof source === 'string' ? 'custom' : 'default';
        const noedit = context.params.noedit;

        // build a view
        if (!source && viewMode === 'default') {
            source = defaultViewSource;
        }

        if (!noedit) {
            if (editor === null) {
                editor = createEditor(dom.editorEl, discovery);
            }

            editor(source, data, context, updateContent, viewMode);
        }

        let config;

        try {
            config = Function('return ' + (source ? '0,' + source : 'null'))();
        } catch (e) {
            console.error(e);
            config = el => {
                el.className = 'report-error render-error';
                el.innerHTML = escapeHtml(String(e)) + '<br>(see details in console)';
            };
        }

        dom.contentEl.innerHTML = '';
        discovery.view.render(dom.contentEl, config, data, context);
    };
}
