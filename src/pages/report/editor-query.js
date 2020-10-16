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

export default function(discovery, updateParams) {
    let expandQueryResults = false;
    let lastQuery = {};

    let queryEditorLiveEditEl;
    const getQuerySuggestions = (query, offset) => discovery.querySuggestions(query, offset, discovery.data, discovery.context);
    const queryEditor = new discovery.view.QueryEditor(getQuerySuggestions).on('change', value =>
        queryEditorLiveEditEl.checked && updateParams({ query: value }, true)
    );
    const queryEngineInfo = discovery.getQueryEngineInfo();
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
    discovery.view.render(queryEditorButtonsEl, {
        view: 'button-primary',
        content: 'text:"Process"',
        onClick: () => {
            lastQuery = {};
            updateParams({
                query: queryEditor.getValue()
            }, true);
            discovery.scheduleRender('page'); // force render
        }
    });

    let errorMarker;

    return {
        el: queryEditorFormEl,
        perform(data, context) {
            let pageQuery = context.params.query;
            let queryTime;
            let results;

            queryEditor.setValue(pageQuery);

            // perform data query
            if (lastQuery.query === pageQuery && lastQuery.data === data && lastQuery.context === context) {
                results = lastQuery.results;
            } else {
                if (errorMarker) {
                    errorMarker.clear();
                    errorMarker = null;
                }

                try {
                    queryTime = Date.now();
                    results = discovery.query(pageQuery, data, context);
                    queryTime = Date.now() - queryTime;
                } catch (error) {
                    const loc = error.details && error.details.loc;
                    const doc = queryEditor.cm.doc;

                    if (loc) {
                        errorMarker = error.details.token === 'EOF'
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

                    lastQuery = {};
                    queryEditorResultEl.innerHTML = '<div class="report-error query-error">' + escapeHtml(error.message) + '</div>';
                    return { error };
                }

                lastQuery = {
                    data,
                    query: pageQuery,
                    context,
                    results
                };

                queryEditorResultEl.innerHTML = '';
                discovery.view.render(queryEditorResultEl, {
                    view: 'expand',
                    title: `text:"${valueDescriptor(results)} in ${parseInt(queryTime, 10)}ms"`,
                    expanded: expandQueryResults,
                    onToggle: state => expandQueryResults = state,
                    content: { view: 'struct', expanded: 1 }
                }, results);
            }

            return { data: results };
        }
    };
}
