import { createElement } from '../../core/utils/dom.js';
import json5 from '/gen/json5.js';

export const defaultViewSource = '{\n    view: \'struct\',\n    expanded: 1\n}';
const defaultViewPresets = [
    {
        name: 'Raw data',
        content: toFormattedViewSource({
            view: 'struct',
            expanded: 1
        })
    },
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

function createEditor(discovery, headerBodyEl, editorEl) {
    let editorErrorMarker = null;
    let updateContent = () => {};
    let liveUpdate = true;

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

    editorEl
        .appendChild(editor.el)
        .appendChild(toolbarEl);

    // presets
    const viewPresets = Array.isArray(discovery.options.viewPresets)
        ? defaultViewPresets.concat(discovery.options.viewPresets)
        : defaultViewPresets;

    headerBodyEl.append(createElement('div', 'presets',
        viewPresets.map(({ name, content }) =>
            createElement('div', {
                class: 'tab',
                onclick: () => updateContent(content) // JSON.stringify(content, null, 4)
            }, name || 'Untitled preset')
        )
    ));

    return {
        update(content, _updateContent) {
            updateContent = _updateContent;

            if (editorErrorMarker) {
                editorErrorMarker.clear();
                editorErrorMarker = null;
            }

            editor.setValue(content);
        },
        error(error) {
            const doc = editor.cm.doc;
            const line = error.lineNumber - 1;
            let column = error.columnNumber - 1;

            if (typeof line === 'number' && typeof column === 'number') {
                const lineText = doc.getLine(line);

                // FIXME: is it a bug of JSON5?
                if (column === -1) {
                    column = lineText;
                }

                editorErrorMarker = lineText.length === column
                    ? doc.setBookmark(
                        { line, ch: column },
                        { widget: createElement('span', 'discovery-editor-error', ' ') }
                    )
                    : doc.markText(
                        { line, ch: column },
                        { line, ch: column + 1 },
                        { className: 'discovery-editor-error' }
                    );
            }
        }
    };
}

function renderHint(discovery, el) {
    const viewListEl = createElement('span');
    const updateAvailableViewList = () =>
        viewListEl.innerHTML = `Available ${discovery.view.names.length} views`;
    const viewListPopup = new discovery.view.Popup({
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
    discovery.view.on('define', updateAvailableViewList);
    updateAvailableViewList();

    // setup hint
    el.title = 'Click for details';
    el.append(viewListEl);
    el.addEventListener('click', () => viewListPopup.toggle(el));
}

export default function(discovery, { headerBodyEl, headerHintEl, editorEl, contentEl }) {
    let editor = null;

    return function(source, data, context, { updateContent, editable }) {
        // init source
        if (typeof source !== 'string') {
            source = defaultViewSource;
        }

        if (editable) {
            if (editor === null) {
                editor = createEditor(discovery, headerBodyEl, editorEl);
                renderHint(discovery, headerHintEl);
            }

            editor.update(source, updateContent);
        }

        try {
            contentEl.innerHTML = '';
            discovery.view.render(contentEl, json5.parse(source), data, context);
        } catch (error) {
            if (editor) {
                editor.error(error);
            }

            throw error;
        }
    };
}
