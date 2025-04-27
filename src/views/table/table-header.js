import { createElement } from '../../core/utils/dom.js';
import { isObject } from '../../core/utils/is-type.js';

function createNextSorting(sorting, defaultOrder, setSorting) {
    if (!sorting) {
        return null;
    }

    return (currentDir) => {
        if (currentDir === 'asc') {
            setSorting(sorting, true);
        } else if (currentDir === 'desc' && !defaultOrder) {
            setSorting();
        } else {
            setSorting(sorting);
        }
    };
}

export default function(host) {
    host.view.define('table-header', async function(el, props, data, context) {
        const { cols, sortings, getRowsOrder, setSorting } = props;
        const headerRowEl = el.appendChild(createElement('tr'));
        const headerCellSorting = [];
        const applySorting = (sorting, desc) => {
            setSorting(sorting, desc);

            for (const headerCellEl of headerRowEl.children) {
                const order = getRowsOrder(headerCellSorting[headerCellEl.cellIndex]);

                headerCellEl.classList.toggle('asc', order === 1);
                headerCellEl.classList.toggle('desc', order === -1);
            }
        };

        return Promise.all(cols.map((headerConfig, i) => {
            const sorting = sortings[i];
            const defaultOrder = getRowsOrder(sorting); // getRowsOrder() returns 0 when all values are equal, it's the same as absence of sorting
            const resolvedSorting = defaultOrder !== 0 ? sorting : null;

            headerCellSorting.push(resolvedSorting);

            return this.render(
                headerRowEl,
                this.composeConfig(
                    {
                        view: 'table-header-cell',
                        initSorting: defaultOrder,
                        nextSorting: createNextSorting(resolvedSorting, defaultOrder, applySorting)
                    },
                    isObject(headerConfig)
                        ? Array.isArray(headerConfig) || 'view' in headerConfig
                            ? { content: headerConfig }
                            : headerConfig
                        : { text: headerConfig }
                ),
                data,
                context
            );
        }));
    }, {
        tag: 'thead'
    });
}
