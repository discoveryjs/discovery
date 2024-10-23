/* eslint-env browser */
import usage from './table.usage.js';

import { isArray, isSet } from '../../core/utils/is-type.js';
import { createElement } from '../../core/utils/dom.js';

function configFromName(name, query) {
    return {
        header: name,
        sorting: `${query} ascN`,
        view: 'table-cell',
        data: query
    };
}

function sortingFromConfig(col, host, context) {
    let prefix = '';
    let query = '';

    if ('data' in col && col.data !== undefined) {
        switch (typeof col.data) {
            case 'string':
                query = `(${col.data || '$'})`;
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

function resolveColConfig(name, config, dataQuery) {
    if (typeof config === 'string') {
        config = { content: config };
    }

    return Object.hasOwn(config, 'content') || Object.hasOwn(config, 'data')
        ? {
            header: name,
            view: 'table-cell',
            ...config
        }
        : {
            ...configFromName(name, dataQuery),
            ...config
        };
}

function toScalar(value) {
    return Array.isArray(value) ? value.length : value;
}

function getOrder(host, data, sorting) {
    if (typeof sorting !== 'function') {
        return false;
    }

    let order = 0;

    try {
        for (let i = 1, prev = toScalar(data[0]); i < data.length; i++) {
            const current = toScalar(data[i]);
            const sign = Math.sign(sorting(prev, current));

            if (sign) {
                if (order && sign !== order) {
                    return false;
                }

                order = sign;
            }

            prev = current;
        }
    } catch (e) {
        host.log('error', 'Error on column order detection in table view', e);
        return 0;
    }

    return -order;
}

export default function(host) {
    const isNotObject = host.queryFn('is not object');

    host.view.define('table', function(el, config, data, context) {
        let { items = data, cols, rowConfig, limit, valueCol = false } = config;
        let renderRowConfig;

        if (isSet(items)) {
            items = [...items];
        }

        if (!isArray(items)) {
            items = items ? [items] : [];
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
                { ...context, cols },
                0,
                host.view.listLimit(limit, 25),
                moreButtonsEl
            ).then(() => moreEl.hidden = !moreButtonsEl.firstChild);
        };

        if (Array.isArray(cols)) {
            cols = cols.map((def, idx) =>
                typeof def === 'string'
                    ? configFromName(def, host.pathToQuery([def]))
                    : {
                        header: 'col' + idx,
                        view: 'table-cell',
                        ...def
                    }
            );
        } else {
            const colNames = new Set();
            const colsMap = cols && typeof cols === 'object' ? cols : {};

            cols = [];

            for (const value of items) {
                if (isNotObject(value)) {
                    valueCol = true;
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

            for (const name of colNames) {
                cols.push(
                    Object.hasOwn(colsMap, name)
                        ? resolveColConfig(name, colsMap[name], host.pathToQuery([name]))
                        : configFromName(name, host.pathToQuery([name]))
                );
            }
        }

        if (valueCol) {
            cols.unshift({
                header: '[value]',
                view: 'table-cell',
                sorting: '$ ascN',
                colSpan: '=is not object ? #.cols.size() : 1',
                content: '=is not object ? "struct"',
                details: false
            });
        }

        cols = cols.filter(col =>
            !Object.hasOwn(col, 'colWhen') || host.queryBool(col.colWhen, data, context)
        );

        for (const col of cols) {
            const sorting = Object.hasOwn(col, 'sorting')
                ? host.query(col.sorting, null, context)
                : sortingFromConfig(col, host, context);
            const defaultOrder = typeof sorting === 'function'
                ? getOrder(host, items, sorting) // getOrder() returns 0 when all values are equal, it's the same as absence of sorting
                : 0;

            const headerCellEl = headEl.appendChild(createElement('th'));
            const headerCell = {
                el: headerCellEl
            };

            headerCells.push(headerCell);
            headerCellEl.textContent = col.header;

            if (defaultOrder !== 0) {
                headerCell.sorting = sorting;
                headerCellEl.classList.add('sortable');
                headerCellEl.addEventListener('click', () => {
                    if (headerCellEl.classList.contains('asc')) {
                        render(items.slice().sort(sorting).reverse());
                    } else if (headerCellEl.classList.contains('desc') && !defaultOrder) {
                        render(items);
                    } else {
                        render(items.slice().sort(sorting));
                    }
                });
            } else {
                col.sorting = false;
            }
        }

        moreButtonsEl.colSpan = cols.length;
        renderRowConfig = this.composeConfig({
            view: 'table-row',
            cols: '=is not object ? [#.cols[]] : #.cols'
        }, rowConfig);

        return render(items);
    }, {
        tag: 'table',
        usage
    });
}
