/* eslint-env browser */

import { numDelim } from '../../core/utils/html.js';

const defaultDetailsRender = { view: 'struct', expanded: 1 };
const hasOwnProperty = Object.hasOwnProperty;

function defaultCellRender(el, data, isDataObject) {
    if (Array.isArray(data)) {
        el.classList.add('number');
        el.textContent = data.length || '';
        return;
    }

    if (isDataObject) {
        el.classList.add('complex');

        for (let k in data) {
            if (hasOwnProperty.call(data, k)) {
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

        if (str.length > 3) {
            el.innerHTML = numDelim(str, false);
        } else {
            el.textContent = str;
        }

        return;
    }

    el.textContent = String(data);
}

export default function(host) {
    host.view.define('table-cell', function(el, config, data, context) {
        let { content, details, colSpan, scalarAsStruct } = config;
        const isDataObject =
            data !== null &&
            (Array.isArray(data) ? data.length > 0 : typeof data === 'object') &&
            data instanceof RegExp === false;

        if (typeof colSpan === 'number' && colSpan > 1) {
            el.colSpan = colSpan;
        }

        if (typeof content === 'function') {
            content = content(data, context);

            if (!content) {
                return;
            }

            content = content.content;
        }

        if (details || (!content && isDataObject)) {
            el.classList.add('details');
            el.addEventListener('click', (e) => {
                let node = e.target;

                if (node === el) {
                    const rowEl = node.parentNode;
                    const bodyEl = rowEl.parentNode;
                    const currentDetailsEl = Array
                        .from(bodyEl.querySelectorAll('.view-table-cell.details-expanded'))
                        .find(td => td.parentNode.parentNode === bodyEl);
                    let detailsEl = null;

                    if (currentDetailsEl) {
                        const currentDetailsRowEl = currentDetailsEl.parentNode;

                        currentDetailsEl.classList.remove('details-expanded');

                        if (currentDetailsEl === el) {
                            rowEl.parentNode.removeChild(rowEl.nextSibling);
                            return;
                        }

                        if (currentDetailsRowEl !== rowEl) {
                            currentDetailsRowEl.parentNode.removeChild(currentDetailsRowEl.nextSibling);
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
                }
            });
        }

        if (scalarAsStruct && !content && !isDataObject) {
            content = 'struct';
        }

        if (content) {
            return host.view.render(el, content, data, context);
        }

        defaultCellRender(el, data, isDataObject);
    }, {
        tag: 'td'
    });
}
