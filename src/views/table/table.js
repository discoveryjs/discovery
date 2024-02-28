/* eslint-env browser */
import usage from './table.usage.js';

import { isArrayLike } from '../../core/utils/is-type.js';
import { createElement } from '../../core/utils/dom.js';

const hasOwnProperty = Object.hasOwnProperty;

function configFromName(name) {
    return {
        header: name,
        view: 'table-cell',
        data: obj => obj[name],
        sorting: `$[${JSON.stringify(name)}] ascN`
    };
}

function sortingFromConfig(col, host, context) {
    let prefix = '';
    let query = '';

    if ('data' in col && col.data !== undefined) {
        switch (typeof col.data) {
            case 'string':
                query = `(${col.data})`;
                break;

            case 'function':
                prefix = '$dataQuery;';
                query = '$dataQuery(#)';
                break;

            default:
                prefix = '$dataQuery;';
                query = '$dataQuery';
        }
    }

    if (typeof col.content === 'string') {
        const colonIndex = col.content.indexOf(':');
        const viewName = col.content.slice(0, colonIndex);

        if (colonIndex === -1 || !host.view.has(viewName)) {
            return;
        }

        const viewQuery = col.content.slice(colonIndex + 1);

        if (viewQuery) {
            query = query ? `(${query} | ${viewQuery})` : `(${viewQuery})`;
        }
    }

    return query
        ? host.query(`${prefix} ${query} ascN`, { dataQuery: col.data }, context)
        : false;
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

function getOrder(host, data, sorting) {
    if (typeof sorting !== 'function') {
        return false;
    }

    let order = 0;

    try {
        for (let i = 1; i < data.length; i++) {
            const sign = Math.sign(sorting(data[i - 1], data[i]));

            if (sign) {
                if (order && sign !== order) {
                    return false;
                }

                order = sign;
            }
        }
    } catch (e) {
        host.log('error', 'Error on column order detection in table view', e);
        return 0;
    }

    return -order;
}

function isScalar(value) {
    return value === null || typeof value !== 'object' || value instanceof RegExp;
}

export default function(host) {
    host.view.define('table', function(el, config, data, context) {
        let { cols, rowConfig, limit } = config;
        let renderRowConfig;

        if (!isArrayLike(data)) {
            data = data ? [data] : [];
        }

        const headEl = el.appendChild(createElement('thead')).appendChild(createElement('tr'));
        const headerCells = [];
        const bodyEl = el.appendChild(createElement('tbody'));
        const moreEl = el.appendChild(createElement('tbody'));
        const moreButtonsEl = moreEl
            .appendChild(createElement('tr'))
            .appendChild(createElement('td'));

        const render = (orderedData) => {
            bodyEl.innerHTML = '';
            moreButtonsEl.innerHTML = '';

            for (const headerCell of headerCells) {
                const order = getOrder(host, orderedData, headerCell.sorting);
                headerCell.el.classList.toggle('asc', order === 1);
                headerCell.el.classList.toggle('desc', order === -1);
            }

            return host.view.renderList(
                bodyEl,
                renderRowConfig,
                orderedData,
                { ...context, isScalar, cols },
                0,
                host.view.listLimit(limit, 25),
                moreButtonsEl
            ).then(() => moreEl.hidden = !moreButtonsEl.firstChild);
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
            const colsMap = cols && typeof cols === 'object' ? cols : {};
            let scalarCol = false;

            cols = [];

            for (const value of data) {
                if (isScalar(value)) {
                    scalarCol = true;
                } else {
                    for (const key of Object.keys(value)) {
                        colNames.add(key);
                    }
                }
            }

            for (const key of Object.keys(colsMap)) {
                if (colsMap[key]) {
                    colNames.add(key);
                } else {
                    colNames.delete(key);
                }
            }

            if (scalarCol) {
                cols.push({
                    header: '[value]',
                    view: 'table-cell',
                    sorting: '$ ascN',
                    scalarAsStruct: true,
                    colSpan: '=$isScalar:#.isScalar;$isScalar() ? #.cols.size() : 1'
                });
            }

            for (const name of colNames) {
                cols.push(
                    hasOwnProperty.call(colsMap, name)
                        ? resolveColConfig(name, colsMap[name])
                        : configFromName(name)
                );
            }
        }

        cols = cols.filter(col =>
            !hasOwnProperty.call(col, 'when') || host.queryBool(col.when, data, context)
        );

        for (const col of cols) {
            if (hasOwnProperty.call(col, 'whenData') && col.whenData !== undefined) {
                const { whenData, content } = col;

                col.whenData = undefined;
                col.content = (data, context) =>
                    host.queryBool(whenData, data, context) ? { content } : undefined;
            }

            const headerCellEl = headEl.appendChild(createElement('th'));
            const headerCell = {
                el: headerCellEl
            };

            headerCells.push(headerCell);
            headerCellEl.textContent = col.header;

            const sorting = hasOwnProperty.call(col, 'sorting')
                ? host.query(col.sorting, null, context)
                : sortingFromConfig(col, host, context);
            const defaultOrder = typeof sorting === 'function'
                ? getOrder(host, data, sorting) // getOrder() returns 0 when all values are equal, it's the same as absence of sorting
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

        moreButtonsEl.colSpan = cols.length;
        renderRowConfig = this.composeConfig({
            view: 'table-row',
            cols: '=$isScalar:#.isScalar;$isScalar() ? [#.cols[]] : #.cols'
        }, rowConfig);

        return render(data);
    }, {
        tag: 'table',
        usage
    });
}
