import { createElement } from '../../core/utils/dom.js';

function count(value, one, many) {
    return value.length ? `${value.length} ${value.length === 1 ? one : many}` : 'empty';
}

function valueDescriptor(value) {
    if (Array.isArray(value)) {
        return `Array (${count(value, 'element', 'elements')})`;
    }

    if (value && typeof value === 'object') {
        return `Object (${count(Object.keys(value), 'key', 'keys')})`;
    }

    return `Scalar (${value === null ? 'null' : typeof value})`;
}

function createEditor(container, discovery) {
    const ctx = {
        data: null,
        context: null,
        updateContent: () => {},
        liveEdit: true
    };

    const queryEngineInfo = discovery.getQueryEngineInfo();
    const liveEditEl = createElement('input', {
        type: 'checkbox',
        checked: ctx.liveEdit,
        onchange: ({ target }) => {
            ctx.liveEdit = target.checked;

            if (ctx.liveEdit) {
                ctx.updateContent(editor.getValue());
            }
        }
    });
    const toolbarEl = createElement('div', 'editor-toolbar', [
        createElement('span', 'syntax-hint',
            `Use <a class="view-link" href="${queryEngineInfo.link}" target="_blank">${
                queryEngineInfo.name
            }</a> ${queryEngineInfo.version || ''} syntax for queries`
        ),
        createElement('label', 'checkbox', [liveEditEl, ' perform on input'])
    ]);

    const getQuerySuggestions = (query, offset) => discovery.querySuggestions(query, offset, ctx.data, ctx.context);
    const editor = new discovery.view.QueryEditor({
        autocomplete: getQuerySuggestions,
        placeholder: 'Jora query...'
    })
        .on('change', value => ctx.liveEdit && ctx.updateContent(value));

    container.appendChild(editor.el);
    editor.el.appendChild(toolbarEl);

    // FIXME: temporary until full migration on discovery render
    discovery.view.render(toolbarEl, {
        view: 'button-primary',
        content: 'text:"Run"',
        onClick: () => ctx.updateContent(editor.getValue(), true)
    });

    return (content, data, context, updateContent) => {
        Object.assign(ctx, { data, context, updateContent });
        editor.setValue(content);
    };
}

export default function(dom, discovery) {
    let expandQueryResults = false;
    let editor = null;

    return function(query, data, context, { updateContent, editable, dataOut }) {
        let queryTime;
        let results;

        if (editable) {
            if (editor === null) {
                editor = createEditor(dom.editorEl, discovery);
            }

            editor(query, data, context, updateContent);
        }

        // perform data query
        queryTime = Date.now();
        results = discovery.query(query, data, context);
        queryTime = Date.now() - queryTime;

        dom.contentEl.innerHTML = '';
        discovery.view.render(dom.contentEl, {
            view: 'expand',
            title: `text:"Out [${dataOut}]: ${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
            expanded: expandQueryResults,
            onToggle: state => expandQueryResults = state,
            content: { view: 'struct', expanded: 1 }
        }, results);

        return { data: results };
    };
}
