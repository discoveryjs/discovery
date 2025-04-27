import { numDelim } from '../../core/utils/html.js';
import { hasOwn } from '../../core/utils/object-utils.js';

const defaultDetailsRender = { view: 'struct', expanded: 1 };
const alignValues = ['left', 'center', 'right'];

function setNumericValue(el, value) {
    let str = String(value);

    el.classList.add('number');

    if (!Number.isFinite(value)) {
        el.classList.add('keyword');
        el.textContent = str;
        return;
    }

    if (str.length > 3) {
        el.innerHTML = numDelim(str, false);
    } else {
        el.textContent = str;
    }
}

export function defaultCellRender(el, data, isDataObject) {
    if (Array.isArray(data) || ArrayBuffer.isView(data)) {
        if (data.length > 0) {
            setNumericValue(el, data.length);
        }
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
        setNumericValue(el, data);
        return;
    }

    if (data === null || data === false || data === true) {
        el.classList.add('keyword');
    }

    el.textContent = String(data);
}

export function createClickHandler(host, el, details, data, context) {
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

export function applyAlign(el, align) {
    if (typeof align === 'string' && alignValues.includes(align)) {
        el.classList.add(`align-${align}`);
    }
}
