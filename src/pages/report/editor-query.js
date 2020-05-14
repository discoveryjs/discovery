import { createElement } from '../../core/utils/dom.js';

function createEditor(discovery, container) {
    let editorErrorMarker = null;
    let suggestions = true;
    let liveEdit = true;
    const ctx = {
        data: null,
        context: null,
        updateContent: () => {}
    };

    const editor = new discovery.view.QueryEditor({
        placeholder: 'Jora query...',
        extraKeys: { 'Cmd-Enter': () => ctx.updateContent(editor.getValue()) },
        autocomplete: (query, offset) =>
            suggestions
                ? discovery.querySuggestions(query, offset, ctx.data, ctx.context)
                : []
    })
        .on('change', value => liveEdit && ctx.updateContent(value));

    const performButtonEl = createElement('span', {
        class: 'perform-button disabled',
        onclick: () => ctx.updateContent(editor.getValue(), true)
    }, 'Run (Cmd+Enter)');

    container
        .appendChild(editor.el)
        .appendChild(createElement('div', 'editor-toolbar', [
            performButtonEl,
            createElement('span', {
                class: 'toggle-button live-update-button',
                title: 'Perform on editing (live update)',
                onclick: ({ target }) => {
                    liveEdit = !liveEdit;
                    target.classList.toggle('disabled', !liveEdit);
                    performButtonEl.classList.toggle('disabled', liveEdit);
                    editor.focus();

                    if (liveEdit) {
                        ctx.updateContent(editor.getValue());
                    }
                }
            }),
            createElement('span', {
                class: 'toggle-button suggestions-button',
                title: 'Show suggestions',
                onclick: ({ target }) => {
                    suggestions = !suggestions;
                    target.classList.toggle('disabled', !suggestions);
                    editor.focus();
                }
            })
        ]));

    return {
        update(content, data, context, updateContent) {
            Object.assign(ctx, { data, context, updateContent });

            if (editorErrorMarker) {
                editorErrorMarker.clear();
                editorErrorMarker = null;
            }

            editor.setValue(content);
        },
        error(error) {
            const loc = error.details && error.details.loc;
            const doc = editor.cm.doc;

            if (loc) {
                editorErrorMarker = error.details.token === 'EOF'
                    ? doc.setBookmark(
                        doc.posFromIndex(error.details.loc.range[0]),
                        { widget: createElement('span', 'discovery-editor-error', ' ') }
                    )
                    : doc.markText(
                        doc.posFromIndex(error.details.loc.range[0]),
                        doc.posFromIndex(error.details.loc.range[1]),
                        { className: 'discovery-editor-error' }
                    );
            }
        }
    };
}

function renderHint(discovery, el) {
    const { name, link, version } = discovery.getQueryEngineInfo();

    el.href = link;
    el.textContent = `${name} ${version || ''}`;
}

export default function(discovery, { editorEl, headerHintEl }) {
    let editor = null;

    renderHint(discovery, headerHintEl);

    return function(query = '', data, context, { updateContent, editable }) {
        if (editable) {
            if (editor === null) {
                editor = createEditor(discovery, editorEl);
            }

            editor.update(query, data, context, updateContent);
        }

        // perform data query
        const queryStartTime = Date.now();

        try {
            return {
                data: discovery.query(query, data, context),
                time: Date.now() - queryStartTime
            };
        } catch (error) {
            if (editor) {
                editor.error(error);
            }

            throw error;
        }
    };
}
