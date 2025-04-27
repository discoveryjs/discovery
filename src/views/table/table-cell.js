import { applyAlign, createClickHandler, defaultCellRender } from './table-cell-utils.js';

export default function(host) {
    host.view.define('table-cell', function(el, config, data, context) {
        let { content, contentWhen = true, details, detailsWhen = true, colSpan, align } = config;
        const isDataObject =
            !content &&
            data !== null &&
            (Array.isArray(data) ? data.length > 0 : typeof data === 'object') &&
            data instanceof RegExp === false;

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

    host.view.define('table-header-cell', function(el, config, data, context) {
        let { content, text, initSorting, nextSorting } = config;

        if (typeof nextSorting === 'function') {
            el.classList.add('sortable');
            el.addEventListener('click', () => nextSorting(
                el.classList.contains('asc') ? 'asc'
                    : el.classList.contains('desc') ? 'desc'
                        : 'none'
            ));
        }

        if (initSorting) {
            el.classList.add(initSorting > 0 ? 'asc' : 'desc');
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text ?? '';
        }
    }, {
        tag: 'th'
    });

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
