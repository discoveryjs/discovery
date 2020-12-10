/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './report/params.js';
import createHeader from './report/header.js';
import createQueryEditor from './report/editor-query.js';
import createViewEditor from './report/editor-view.js';

export default function(discovery) {
    function updateParams(delta, replace) {
        return discovery.setPageParams({
            ...discovery.pageParams,
            ...delta
        }, replace);
    }

    const header = createHeader(discovery, updateParams);
    const queryEditor = createQueryEditor(discovery, updateParams);
    const viewEditor = createViewEditor(discovery, updateParams);

    //
    // Report layout
    //
    const reportEditorEl = createElement('div', { class: 'report-editor', hidden: true }, [
        queryEditor.el,
        viewEditor.el
    ]);
    const reportContentEl = createElement('div', 'report-content');
    const layout = [
        ...header.el,
        reportEditorEl,
        reportContentEl
    ];

    //
    // Page
    //
    discovery.page.define('report', function(el, data, context) {
        // process noedit setting
        reportEditorEl.hidden = context.params.noedit;

        // update report title
        header.render(data, context);

        // perform query
        const queryResult = queryEditor.perform(data, context);

        if (queryResult.error) {
            viewEditor.el.hidden = true;
            reportContentEl.hidden = true;
            return;
        }

        viewEditor.el.hidden = false;
        reportContentEl.hidden = false;

        viewEditor.render(queryResult.data, context, reportContentEl);
    }, {
        reuseEl: true,
        init(el) {
            layout.forEach(child => el.appendChild(child));
        },
        encodeParams,
        decodeParams
    });
}
