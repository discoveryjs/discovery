import { createElement } from '../../core/utils/dom.js';
import marked from '/gen/marked.js';

marked.setOptions({
    smartLists: true
});

function createEditor(discovery, headerBodyEl, editorEl) {
    let editorErrorMarker = null;
    let updateContent = () => {};
    let liveUpdate = true;

    const editor = new discovery.view.MarkdownEditor({
        placeholder: 'Markdown...',
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
        })
    ]);

    editorEl
        .appendChild(editor.el)
        .appendChild(toolbarEl);

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
    el.textContent = 'marked 1.1';
}

export default function(discovery, { headerBodyEl, headerHintEl, editorEl, contentEl }) {
    let editor = null;

    return function(source = '', data, context, { updateContent, editable }) {
        if (editable) {
            if (editor === null) {
                editor = createEditor(discovery, headerBodyEl, editorEl);
                renderHint(discovery, headerHintEl);
            }

            editor.update(source, updateContent);
        }

        try {
            contentEl.innerHTML = marked(source);
            [...contentEl.querySelectorAll('li')].forEach(li => {
                if (li.firstElementChild && li.firstElementChild.tagName === 'INPUT' && li.firstElementChild.type === 'checkbox') {
                    li.classList.add('check-list-item');
                }
            });
        } catch (error) {
            if (editor) {
                editor.error(error);
            }

            throw error;
        }
    };
}
