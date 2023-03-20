import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { contextWithoutEditorParams } from './params.js';

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

export default function(host, updateParams) {
    let expandQueryResults = false;
    let lastQuery = {};

    let queryEditorLiveEditEl;
    const getQuerySuggestions = (query, offset, data, context) => host.querySuggestions(query, offset, data, context);
    const queryEditor = new host.view.QueryEditor(getQuerySuggestions).on('change', value =>
        queryEditorLiveEditEl.checked && updateParams({ query: value }, true)
    );
    const queryEngineInfo = host.getQueryEngineInfo();
    const queryEditorButtonsEl = createElement('div', 'buttons');
    const queryEditorResultEl = createElement('div', 'data-query-result');
    const queryEditorFormEl = createElement('div', 'form query-editor-form', [
        createElement('div', 'query-editor', [
            queryEditor.el,
            createElement('div', 'editor-toolbar', [
                createElement('span', 'syntax-hint',
                    `Use <a class="view-link" href="${queryEngineInfo.link}" target="_blank">${
                        queryEngineInfo.name
                    }</a> ${queryEngineInfo.version || ''} syntax for queries`
                ),
                createElement('label', 'view-checkbox', [
                    queryEditorLiveEditEl = createElement('input', {
                        class: 'live-update',
                        type: 'checkbox',
                        checked: true,
                        onchange: (e) => {
                            if (e.target.checked) {
                                updateParams({
                                    query: queryEditor.getValue()
                                }, true);
                            }
                        }
                    }),
                    createElement('span', 'view-checkbox__label', 'process on input')
                ]),
                queryEditorButtonsEl
            ])
        ]),
        queryEditorResultEl
    ]);
    // FIXME: temporary until full migration on discovery render
    host.view.render(queryEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Process"',
        onClick: () => {
            lastQuery = {};
            updateParams({
                query: queryEditor.getValue()
            }, true);
            host.scheduleRender('page'); // force render
        }
    });

    let errorMarker;

    return {
        el: queryEditorFormEl,
        perform(data, context) {
            const queryContext = contextWithoutEditorParams(context, lastQuery.context);
            let pageQuery = context.params.query;
            let queryTime;
            let results;

            // update editor
            queryEditor.setValue(pageQuery, data, queryContext);

            // perform data query
            if (lastQuery.query === pageQuery && lastQuery.data === data && lastQuery.context === queryContext) {
                results = lastQuery.results;
            } else {
                if (errorMarker) {
                    errorMarker.clear();
                    errorMarker = null;
                }

                try {
                    queryTime = Date.now();
                    results = host.query(pageQuery, data, queryContext);
                    queryTime = Date.now() - queryTime;
                } catch (error) {
                    const loc = error.details && error.details.loc;
                    const doc = queryEditor.cm.doc;

                    if (loc) {
                        const [start, end] = error.details.loc.range;

                        errorMarker = error.details.token === 'EOF' || start === end || pageQuery[start] === '\n'
                            ? doc.setBookmark(
                                doc.posFromIndex(start),
                                { widget: createElement('span', 'discovery-editor-error', ' ') }
                            )
                            : doc.markText(
                                doc.posFromIndex(start),
                                doc.posFromIndex(end),
                                { className: 'discovery-editor-error' }
                            );
                    }

                    lastQuery = {};
                    queryEditorResultEl.innerHTML = '<div class="report-error query-error">' + escapeHtml(error.message) + '</div>';
                    return { error };
                }

                lastQuery = {
                    data,
                    context: queryContext,
                    query: pageQuery,
                    results
                };

                queryEditorResultEl.innerHTML = '';
                host.view.render(queryEditorResultEl, {
                    view: 'expand',
                    header: `text:"${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
                    expanded: expandQueryResults,
                    onToggle: state => expandQueryResults = state,
                    content: { view: 'struct', expanded: 1 }
                }, results);
            }

            return { data: results };
        }
    };
}
