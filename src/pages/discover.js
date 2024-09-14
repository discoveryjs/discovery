/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './discover/params.js';
import createHeader from './discover/header.js';
import createQueryEditor from './discover/editor-query.js';
import createViewEditor from './discover/editor-view.js';

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

    function acceptChanges(data) {
        return data === lastPerformData;
    }

    let refs = null;
    let lastRequest = null;
    let lastPerformData = NaN; // used NaN to mismatch with any value
    let lastPageId = null;

    host.on('pageHashChange', () => {
        if (lastPageId !== host.pageId) {
            if (host.pageId === host.discoveryPageId) {
                // enter discovery page
                host.action.define('queryAcceptChanges', acceptChanges);
                host.action.define('querySubquery', (query, rootData) => {
                    if (acceptChanges(rootData)) {
                        get().queryEditor.createSubquery(query);
                    }
                });
                host.action.define('queryAppend', (query, rootData) => {
                    if (acceptChanges(rootData)) {
                        get().queryEditor.appendToQuery(query);
                    }
                });
            } else {
                // leave discovery page
                host.action.revoke('queryAcceptChanges');
                host.action.revoke('querySubquery');
                host.action.revoke('queryAppend');
            }

            lastPageId = host.pageId;
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
        const request = lastRequest = {};
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
