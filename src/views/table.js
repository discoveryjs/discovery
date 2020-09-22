/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
const hasOwnProperty = Object.hasOwnProperty;

function configFromName(name) {
    return {
        header: name,
        view: 'table-cell',
        data: obj => obj[name],
        sorting: `$[${JSON.stringify(name)}] ascN`
    };
}

function sortingFromString(query, view) {
    if (typeof query !== 'string') {
        return;
    }

    if (view) {
        const colonIndex = query.indexOf(':');

        if (colonIndex === -1) {
            return;
        }

        query = query.slice(colonIndex + 1);
    }

    return `(${query || '$'}) ascN`;
}

function resolveColConfig(name, config) {
    if (typeof config === 'string') {
        config = { content: config };
    }

    return hasOwnProperty.call(config, 'content') || hasOwnProperty.call(config, 'data')
        ? {
            header: name,
            view: 'table-cell',
            ...config
        }
        : {
            ...configFromName(name),
            ...config
        };
}

function getOrder(data, sorting) {
    if (typeof sorting !== 'function') {
        return false;
    }

    let order = 0;
    for (let i = 1; i < data.length; i++) {
        const sign = Math.sign(sorting(data[i - 1], data[i]));

        if (sign) {
            if (order && sign !== order) {
                return false;
            }

            order = sign;
        }
    }

    return -order;
}

export default function(discovery) {
    discovery.view.define('table', function(el, config, data, context) {
        let { cols, rowConfig, limit } = config;
        let colsMap = cols && typeof cols === 'object' ? cols : {};
        let scalarCol = false;

        if (!Array.isArray(data)) {
            data = data ? [data] : [];
        }

        const headEl = el.appendChild(createElement('thead'));
        const headerCells = [];
        const bodyEl = el.appendChild(createElement('tbody'));
        const moreEl = el
            .appendChild(createElement('tbody'))
            .appendChild(createElement('tr'))
            .appendChild(createElement('td'));

        const render = (orderedData) => {
            bodyEl.innerHTML = '';
            moreEl.innerHTML = '';

            for (const headerCell of headerCells) {
                const order = getOrder(orderedData, headerCell.sorting);
                headerCell.el.classList.toggle('asc', order === 1);
                headerCell.el.classList.toggle('desc', order === -1);
            }

            discovery.view.renderList(bodyEl, this.composeConfig({
                view: 'table-row',
                cols
            }, rowConfig), orderedData, context, 0, discovery.view.listLimit(limit, 25), moreEl);
        };

        if (Array.isArray(cols)) {
            cols = cols.map((def, idx) =>
                typeof def === 'string'
                    ? configFromName(def)
                    : {
                        header: 'col' + idx,
                        view: 'table-cell',
                        ...def
                    }
            );
        } else {
            const colNames = new Set();
            cols = [];

            data
                .forEach(item => {
                    if (item && typeof item === 'object') {
                        for (const key in item) {
                            colNames.add(key);
                        }
                    } else {
                        scalarCol = true;
                    }
                });

            Object.keys(colsMap)
                .forEach(name => colsMap[name] ? colNames.add(name) : colNames.delete(name));

            if (scalarCol) {
                cols.push({
                    header: '[value]',
                    view: 'table-cell',
                    data: String
                });
            }

            colNames.forEach(name =>
                cols.push(
                    hasOwnProperty.call(colsMap, name)
                        ? resolveColConfig(name, colsMap[name])
                        : configFromName(name)
                )
            );
        }

        cols = cols.filter(col =>
            !hasOwnProperty.call(col, 'when') || discovery.queryBool(col.when, data, context)
        );

        for (const col of cols) {
            if (hasOwnProperty.call(col, 'whenData') && col.whenData !== undefined) {
                const { whenData, content } = col;

                col.whenData = undefined;
                col.content = (data, context) =>
                    discovery.queryBool(whenData, data, context) ? { content } : undefined;
            }

            const headerCellEl = headEl.appendChild(createElement('th'));
            const headerCell = {
                el: headerCellEl
            };

            headerCells.push(headerCell);
            headerCellEl.textContent = col.header;

            const sorting = discovery.query(
                hasOwnProperty.call(col, 'sorting')
                    ? col.sorting
                    : sortingFromString(col.content, true) || sortingFromString(col.data),
                null,
                context
            );
            const defaultOrder = typeof sorting === 'function'
                ? getOrder(data, sorting) // getOrder() returns 0 when all values are equal, it's the same as absence of sorting
                : 0;

            if (defaultOrder !== 0) {
                col.sorting = sorting;
                headerCell.sorting = sorting;
                headerCellEl.classList.add('sortable');
                headerCellEl.addEventListener('click', () => {
                    if (headerCellEl.classList.contains('asc')) {
                        render(data.slice().sort((a, b) => -sorting(a, b)));
                    } else if (headerCellEl.classList.contains('desc') && !defaultOrder) {
                        render(data);
                    } else {
                        render(data.slice().sort(sorting));
                    }
                });
            } else {
                col.sorting = false;
            }
        }

        moreEl.colSpan = cols.length;
        render(data);
    }, {
        tag: 'table'
    });
}
