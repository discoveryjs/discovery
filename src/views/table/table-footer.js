import { createElement, createFragment } from '../../core/utils/dom.js';
import { isObject } from '../../core/utils/is-type.js';

function extractCells(cols, composeConfig) {
    const footerCells = [];

    for (let i = 0; i < cols.length; i++) {
        const value = cols[i];

        if (value === undefined) {
            continue;
        }

        footerCells.push({
            index: i,
            config: composeConfig(
                { view: 'table-footer-cell' },
                isObject(value) && typeof value.view !== 'string'
                    ? value
                    : { content: value }
            )
        });
    }

    return footerCells;
}

export default function(host) {
    host.view.define('table-footer', async function(el, props, data, context) {
        const { cols } = props;
        const footerCells = extractCells(cols, this.composeConfig);
        const footerRowEl = el.appendChild(createElement('tr'));
        const footerFragments = footerCells.map(() => createFragment());

        // render cells
        const renderResults = await Promise.allSettled(footerCells.map(({ config }, idx) =>
            this.render(footerFragments[idx], config, data, context)
        ));

        // normalize cells positions by adding empty cells and adjusting colSpans
        const createEmptyCell = () => createElement('td', { class: 'view-table-footer-cell' });
        let colIndex = 0;
        renderResults.forEach((result, index) => {
            const { index: shouldBeIndex, config } = footerCells[index];
            const fragment = footerFragments[index];
            let cellEl = fragment.firstChild;

            if (result.status === 'rejected') {
                host.view.renderError(footerRowEl.appendChild(cellEl = createEmptyCell()), result.reason, config);
            } else if (!cellEl) {
                footerRowEl.append(cellEl = createEmptyCell());
            } else if (cellEl.nodeType !== 1 || cellEl.tagName !== 'TD') {
                if (cellEl.classList?.contains?.('discovery-buildin-view-render-error')) {
                    const content = cellEl;
                    footerRowEl.appendChild(cellEl = createEmptyCell()).append(content);
                } else {
                    host.view.renderError(footerRowEl.appendChild(cellEl = createEmptyCell()), 'non <td> element', config);
                }
            } else {
                footerRowEl.append(cellEl);

                if (colIndex > shouldBeIndex) {
                    const prevCellEl = cellEl.previousElementSibling;
                    prevCellEl.colSpan = shouldBeIndex - prevCellEl.cellIndex;
                } else {
                    for (let i = shouldBeIndex - colIndex; i > 0; i--) {
                        cellEl.before(createEmptyCell());
                    }
                }
            }

            colIndex = shouldBeIndex + cellEl.colSpan;
        });

        // pad end with empty cells if needed
        for (let i = cols.length - colIndex; i > 0; i--) {
            footerRowEl.append(createEmptyCell());
        }
    }, {
        tag: 'tfoot'
    });
}
