import { stringifyIfNeeded } from './value-to-html.js';

export const createClickHandler = (
    expandValue,
    collapseValue,
    scheduleApplyAnnotations,
    renderTable,
    structViewRoots,
    valueActionsPopup,
    signaturePopup
) => ({ target }) => {
    let action = 'expand';
    let cursor = target.closest(`
        .view-struct.struct-expand,
        .view-struct .struct-expand-value,
        .view-struct .struct-action-button
    `);

    if (!cursor) {
        return;
    }

    if (cursor.dataset.action) {
        action = cursor.dataset.action;
    }

    switch (action) {
        case 'expand':
            if (cursor.classList.contains('struct-expand')) {
                // expand root element
                cursor = cursor.lastChild;
            }

            // expand value
            expandValue(cursor, 0);
            scheduleApplyAnnotations();
            cursor.parentNode.classList.add('struct-expanded-value');

            if (structViewRoots.has(cursor.parentNode)) {
                cursor.parentNode.classList.remove('struct-expand');
            }
            break;

        case 'collapse':
            cursor = cursor.parentNode;
            collapseValue(cursor);
            scheduleApplyAnnotations();
            cursor.parentNode.classList.remove('struct-expanded-value');
            cursor.classList.remove('view-as-table');

            if (structViewRoots.has(cursor.parentNode)) {
                cursor.parentNode.classList.add('struct-expand');
            }
            break;

        case 'show-signature':
            signaturePopup.show(cursor);
            break;

        case 'value-actions':
            valueActionsPopup.show(cursor);
            break;

        case 'toggle-sort-keys':
            expandValue(cursor.parentNode, 0, cursor.parentNode.classList.toggle('sort-keys'));
            scheduleApplyAnnotations();
            break;

        case 'toggle-string-mode': {
            cursor = cursor.parentNode;

            const asText = cursor.classList.toggle('string-value-as-text');

            for (let child = cursor.querySelector('.string-text').firstChild; child !== null; child = child.nextSibling) {
                const textNode = child.nodeType === 3 ? child : child.firstChild;
                const value = textNode.nodeValue;

                if (asText) {
                    if (value.indexOf('\\') !== -1) {
                        textNode.nodeValue = JSON.parse(`"${value}"`);
                    }
                } else {
                    const newValue = stringifyIfNeeded(value);

                    if (newValue !== value) {
                        textNode.nodeValue = newValue;
                    }
                }
            }
            break;
        }

        case 'toggle-view-as-table':
            cursor = cursor.parentNode;

            if (cursor.classList.toggle('view-as-table')) {
                renderTable(cursor);
            } else {
                cursor.querySelector(':scope > .view-table')?.remove();
            }
            break;
    }
};
