/* eslint-env browser */
import usage from './table.usage.js';

import { isArray, isSet } from '../../core/utils/is-type.js';
import { createElement } from '../../core/utils/dom.js';
import { hasOwn } from '../../core/utils/object-utils.js';

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

    return hasOwn(config, 'content') || hasOwn(config, 'data')
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

function getRowsOrder(host, rows, sorting) {
    if (typeof sorting !== 'function') {
        return 0;
    }

    let order = 0;

    try {
        for (let i = 1, prev = toScalar(rows[0]); i < rows.length; i++) {
            const current = toScalar(rows[i]);
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
        host.logger.error('Error on column order detection in table view', e);
        return 0;
    }

    return -order || 0;
}

export default function(host) {
    const isNotObject = host.queryFn('is not object');

    host.view.define('table', function(el, config, data, context) {
        let { rows, cols, rowConfig, valueCol = false, headerWhen = true, footerWhen = true, limit } = config;
        let renderRowConfig;

        if ('rows' in config === false) {
            rows = data;
        }

        if (isSet(rows)) {
            rows = [...rows];
        }

        if (!isArray(rows)) {
            rows = rows ? [rows] : [];
        }

        let currentRows = rows;
        const bodyEl = createElement('tbody');
        const moreEl = createElement('tbody', { class: 'view-table-more-buttons' });
        const moreButtonsEl = moreEl
            .appendChild(createElement('tr'))
            .appendChild(createElement('td'));

        const renderHeader = () => {
            if (!host.query(headerWhen, data, context)) {
                return;
            }

            const headerCells = cols.map(col => col.header);
            const headerSortings = cols.map(col =>
                hasOwn(col, 'sorting')
                    ? host.query(col.sorting, null, context)
                    : sortingFromConfig(col, host, context)
            );

            return this.render(el, {
                view: 'table-header',
                cols: headerCells,
                sortings: headerSortings,
                getRowsOrder: sorting => getRowsOrder(host, currentRows, sorting),
                setSorting(sorting, desc) {
                    if (typeof sorting === 'function') {
                        const sortedRows = rows.slice().sort(sorting);

                        if (desc) {
                            sortedRows.reverse();
                        }

                        renderRows(sortedRows);
                    } else {
                        renderRows(rows);
                    }
                }
            }, data, context);
        };
        const renderFooter = () => {
            const footerCells = cols.map(col => col.footer);

            if (!host.query(footerWhen, data, context) || !footerCells.some(cell => cell !== undefined)) {
                return;
            }

            return this.render(el, {
                view: 'table-footer',
                cols: footerCells
            }, data, context);
        };
        const renderRows = async (orderedData) => {
            currentRows = orderedData;
            bodyEl.innerHTML = '';
            moreButtonsEl.innerHTML = '';

            el.append(bodyEl, moreEl);

            return host.view.renderList(
                bodyEl,
                renderRowConfig,
                currentRows,
                { ...context, cols },
                0,
                host.view.listLimit(limit, 25),
                {
                    moreContainer: moreButtonsEl,
                    onSliceRender: restCount => restCount === 0 && moreEl.remove()
                }
            );
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

            for (const value of rows) {
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
                    hasOwn(colsMap, name)
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
                details: '=is object ? "struct"'
            });
        }

        cols = cols.filter(col =>
            !hasOwn(col, 'colWhen') || host.queryBool(col.colWhen, data, context)
        );

        moreButtonsEl.colSpan = cols.length;
        renderRowConfig = this.composeConfig({
            view: 'table-row',
            cols: valueCol
                ? '=is not object ? [#.cols[]] : #.cols'
                : '=#.cols'
        }, rowConfig);

        return Promise.all([
            renderHeader(),
            renderRows(rows),
            renderFooter()
        ]);
    }, {
        tag: 'table',
        usage
    });
}
