/* eslint-env browser */
import usage from './table.usage.js';

import { createElement } from '../core/utils/dom.js';
const hasOwnProperty = Object.hasOwnProperty;

function configFromName(name) {
    return {
        header: name,
        view: 'table-cell',
        data: obj => obj[name],
        sorting: `$[${JSON.stringify(name)}] desc`
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

    return `(${query || '$'}) desc`;
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

export default function(discovery) {
    discovery.view.define('table', function(el, config, data, context) {
        let { cols, rowConfig, limit } = config;
        let colsMap = cols && typeof cols === 'object' ? cols : {};
        let scalarCol = false;
        let currentSortingCol = null;
        let currentSortingColAsc = null;

        if (!Array.isArray(data)) {
            data = data ? [data] : [];
        }

        const headEl = el.appendChild(createElement('thead'));
        const bodyEl = el.appendChild(createElement('tbody'));
        const moreEl = el
            .appendChild(createElement('tbody'))
            .appendChild(createElement('tr'))
            .appendChild(createElement('td'));

        const render = (orderedData) => {
            bodyEl.innerHTML = '';
            moreEl.innerHTML = '';
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
        } else if (Array.isArray(data)) {
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
        } else {
            console.warn('config.cols and data is not an array, no way to build a table');
            return;
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

            headerCellEl.textContent = col.header;

            const sorting = discovery.query(
                hasOwnProperty.call(col, 'sorting')
                    ? col.sorting
                    : sortingFromString(col.content, true) || sortingFromString(col.data),
                null,
                context
            );

            if (typeof sorting === 'function') {
                headerCellEl.classList.add('sortable');
                headerCellEl.addEventListener('click', () => {
                    if (currentSortingCol === headerCellEl) {
                        if (currentSortingColAsc) {
                            headerCellEl.classList.remove('asc');
                            headerCellEl.classList.add('desc');
                            currentSortingColAsc = false;
                            render(data.slice().sort((a, b) => -sorting(a, b)));
                        } else {
                            headerCellEl.classList.remove('desc');
                            currentSortingCol = null;
                            render(data);
                        }
                    } else {
                        if (currentSortingCol !== null) {
                            currentSortingCol.classList.remove('asc', 'desc');
                        }

                        currentSortingCol = headerCellEl;
                        currentSortingColAsc = true;
                        headerCellEl.classList.add('asc');
                        render(data.slice().sort(sorting));
                    }
                });
            }
        }

        moreEl.colSpan = cols.length;
        render(data);
    }, {
        tag: 'table',
        usage
    });
}
