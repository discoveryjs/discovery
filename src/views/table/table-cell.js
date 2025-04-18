/* eslint-env browser */

import { numDelim } from '../../core/utils/html.js';
import { hasOwn } from '../../core/utils/object-utils.js';

const defaultDetailsRender = { view: 'struct', expanded: 1 };

function defaultCellRender(el, data, isDataObject) {
    if (Array.isArray(data) || ArrayBuffer.isView(data)) {
        el.classList.add('number');
        el.textContent = data.length || '';
        return;
    }

    if (isDataObject) {
        el.classList.add('complex');

        for (let k in data) {
            if (hasOwn(data, k)) {
                el.textContent = '{…}';
                return;
            }
        }

        el.textContent = '{}';
        return;
    }

    if (data === undefined) {
        return;
    }

    if (typeof data === 'number') {
        let str = String(data);

        el.classList.add('number');

        if (!Number.isFinite(data)) {
            el.classList.add('keyword');
            el.textContent = str;
            return;
        }

        if (str.length > 3) {
            el.innerHTML = numDelim(str, false);
        } else {
            el.textContent = str;
        }

        return;
    }

    if (data === null || data === false || data === true) {
        el.classList.add('keyword');
    }

    el.textContent = String(data);
}

function createClickHandler(host, el, details, data, context) {
    return () => {
        const rowEl = el.parentNode;
        const bodyEl = rowEl.parentNode;
        const currentDetailsEl = Array
            .from(bodyEl.querySelectorAll('.view-table-cell.details-expanded'))
            .find(td => td.parentNode.parentNode === bodyEl);
        let detailsEl = null;

        if (currentDetailsEl) {
            const currentDetailsRowEl = currentDetailsEl.parentNode;

            currentDetailsEl.classList.remove('details-expanded');

            if (currentDetailsEl === el) {
                rowEl.nextSibling.remove();
                return;
            }

            if (currentDetailsRowEl !== rowEl) {
                currentDetailsRowEl.nextSibling.remove();
            } else {
                detailsEl = rowEl.nextSibling.firstChild;
                detailsEl.innerHTML = '';
            }
        }

        if (detailsEl === null) {
            detailsEl = rowEl.parentNode
                .insertBefore(document.createElement('tr'), rowEl.nextSibling)
                .appendChild(document.createElement('td'));
            detailsEl.parentNode.className = 'view-table-cell-details-row';
            detailsEl.className = 'view-cell-details-content';
            detailsEl.colSpan = 1000;
        }

        el.classList.add('details-expanded');
        host.view.render(detailsEl, details || defaultDetailsRender, data, context);
    };
}

export default function(host) {
    host.view.define('table-cell', function(el, config, data, context) {
        let { content, contentWhen = true, details, detailsWhen = true, colSpan } = config;
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

    host.view.define('table-footer-cell', function(el, config, data, context) {
        let { content, contentWhen = true, details, detailsWhen = true, colSpan } = config;
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
