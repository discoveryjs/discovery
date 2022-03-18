/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './report/params.js';
import createHeader from './report/header.js';
import createQueryEditor from './report/editor-query.js';
import createViewEditor from './report/editor-view.js';

export default function(host) {
    function updateParams(delta, replace) {
        return host.setPageParams({
            ...host.pageParams,
            ...delta
        }, replace);
    }

    function get() {
        if (refs !== null) {
            return refs;
        }

        const header = createHeader(host, updateParams);
        const queryEditor = createQueryEditor(host, updateParams);
        const viewEditor = createViewEditor(host, updateParams);

        // layout elements
        const reportEditorEl = createElement('div', { class: 'report-editor discovery-hidden-in-dzen', hidden: true }, [
            queryEditor.el,
            viewEditor.el
        ]);
        const reportContentEl = createElement('div', 'report-content');
        const layout = [
            ...header.el,
            reportEditorEl,
            reportContentEl
        ];

        return refs = {
            header,
            queryEditor,
            viewEditor,
            reportEditorEl,
            reportContentEl,
            layout
        };
    }

    let refs = null;

    //
    // Page
    //
    host.page.define('report', function(el, data, context) {
        const {
            header,
            queryEditor,
            viewEditor,
            reportEditorEl,
            reportContentEl
        } = get();

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
            get().layout.forEach(child => el.appendChild(child));
        },
        encodeParams,
        decodeParams
    });
}
