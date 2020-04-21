import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';

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
    const buttonsEl = createElement('div', 'buttons');
    const liveEditEl = createElement('input', {
        class: 'live-update',
        type: 'checkbox',
        checked: ctx.liveEdit,
        onchange: ({ target }) => {
            ctx.liveEdit = target.checked;

            if (ctx.liveEdit) {
                ctx.updateContent(editor.getValue());
            }
        }
    });

    const getQuerySuggestions = (query, offset) => discovery.querySuggestions(query, offset, ctx.data, ctx.context);
    const editor = new discovery.view.QueryEditor(getQuerySuggestions)
        .on('change', value => ctx.liveEdit && ctx.updateContent(value));

    container.appendChild(editor.el);
    container.appendChild(createElement('div', 'editor-toolbar', [
        createElement('span', 'syntax-hint',
            `Use <a class="view-link" href="${queryEngineInfo.link}" target="_blank">${
                queryEngineInfo.name
            }</a> ${queryEngineInfo.version || ''} syntax for queries`
        ),
        createElement('label', null, [liveEditEl, ' process on input']),
        buttonsEl
    ]));

    // FIXME: temporary until full migration on discovery render
    discovery.view.render(buttonsEl, {
        view: 'button-primary',
        content: 'text:"Process"',
        onClick: () => {
            ctx.updateContent(editor.getValue(), true);
        }
    });

    return (content, data, context, updateContent) => {
        Object.assign(ctx, { data, context, updateContent });
        editor.setValue(content);
    };
}

export default function(dom, discovery) {
    let expandQueryResults = false;
    let editor = null;

    return function(query, data, context, updateContent) {
        const noedit = context.params.noedit;
        let queryTime;
        let results;

        if (!noedit) {
            if (editor === null) {
                editor = createEditor(dom.editorEl, discovery);
            }

            editor(query, data, context, updateContent);
        }

        // perform data query
        try {
            queryTime = Date.now();
            results = discovery.query(query, data, context);
            queryTime = Date.now() - queryTime;
        } catch (error) {
            dom.contentEl.innerHTML = '<div class="report-error query-error">' + escapeHtml(error.message) + '</div>';
            return { error };
        }

        dom.contentEl.innerHTML = '';
        discovery.view.render(dom.contentEl, {
            view: 'expand',
            title: `text:"${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
            expanded: expandQueryResults,
            onToggle: state => expandQueryResults = state,
            content: { view: 'struct', expanded: 1 }
        }, results);

        return { data: results };
    };
}
