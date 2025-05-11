import { applyAlign, createClickHandler, defaultCellRender } from './table-cell-utils.js';

export default function(host) {
    host.view.define('table-footer-cell', function(el, config, data, context) {
        let { content, contentWhen = true, details, detailsWhen = true, colSpan, align } = config;
        const isDataObject =
            !content &&
            data !== null &&
            (Array.isArray(data) ? data.length > 0 : typeof data === 'object') &&
            data instanceof RegExp === false;

        el.classList.add('view-table-cell');

        if (typeof colSpan === 'number' && colSpan > 1) {
            el.colSpan = colSpan;
        }

        if (!host.queryBool(contentWhen, data, context)) {
            return;
        }

        applyAlign(el, align);

        if ((details || (details === undefined && isDataObject)) && host.queryBool(detailsWhen, data, context)) {
            el.classList.add('details');
            el.addEventListener('click', createClickHandler(host, el, details, data, context));
        }

        if (content) {
            return host.view.render(el, content, data, context);
        }

        defaultCellRender(el, data, isDataObject);
    }, {
        tag: 'td'
    });
}
