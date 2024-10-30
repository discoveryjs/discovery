/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './discovery/params.js';
import createHeader from './discovery/header.js';
import createQueryEditor from './discovery/editor-query.js';
import createViewEditor from './discovery/editor-view.js';

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
        const discoverEditorEl = createElement('div', { class: 'discovery-editor discovery-hidden-in-dzen', hidden: true }, [
            queryEditor.el,
            viewEditor.el
        ]);
        const discoverContentEl = createElement('div', 'discovery-render-content');
        const layout = [
            ...header.el,
            discoverEditorEl,
            discoverContentEl
        ];

        return refs = {
            header,
            queryEditor,
            viewEditor,
            discoverEditorEl,
            discoverContentEl,
            layout
        };
    }

    function actionQueryAcceptChanges(data) {
        return data === lastPerformData;
    }

    function actionQuerySubquery(query, rootData) {
        if (actionQueryAcceptChanges(rootData)) {
            get().queryEditor.createSubquery(query);
        }
    }

    function actionQueryAppend(query, rootData) {
        if (actionQueryAcceptChanges(rootData)) {
            get().queryEditor.appendToQuery(query);
        }
    }

    let refs = null;
    let lastRequest = null;
    let lastPerformData = NaN; // used NaN to mismatch with any value

    host.on('pageStateChange', (prev) => {
        if (host.pageId !== prev.id) {
            if (host.pageId === host.discoveryPageId) {
                // enter discovery page
                // Note: Don't define action functions in place to ensure context comparison works
                host.action.define('queryAcceptChanges', actionQueryAcceptChanges);
                host.action.define('querySubquery', actionQuerySubquery);
                host.action.define('queryAppend', actionQueryAppend);
            } else {
                // leave discovery page
                host.action.revoke('queryAcceptChanges');
                host.action.revoke('querySubquery');
                host.action.revoke('queryAppend');
            }
        }
    });

    //
    // Page
    //
    host.page.define('discovery', function(el, data, context) {
        const {
            header,
            queryEditor,
            viewEditor,
            discoverEditorEl,
            discoverContentEl
        } = get();

        // process noedit setting
        discoverEditorEl.hidden = context.params.noedit;

        // update page title
        header.render(data, context);

        // set last perform data to mismatch with any value
        lastPerformData = NaN;

        // perform query
        const request = lastRequest = Symbol('last-query-request');
        queryEditor.perform(data, context).then(queryResult => {
            if (lastRequest !== request) {
                return;
            }

            if (queryResult.error) {
                viewEditor.el.hidden = true;
                discoverContentEl.hidden = true;
                return;
            }

            lastPerformData = queryResult.computed;
            viewEditor.el.hidden = false;
            discoverContentEl.hidden = false;

            viewEditor.render(lastPerformData, /* queryResult.context */ context, discoverContentEl);
        });
    }, {
        reuseEl: true,
        init(el) {
            get().layout.forEach(child => el.appendChild(child));
        },
        encodeParams,
        decodeParams
    });
}
