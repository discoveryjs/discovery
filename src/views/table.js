/* eslint-env browser */

const hasOwnProperty = Object.prototype.hasOwnProperty;
const self = data => data;

function configFromName(name) {
    return {
        header: name,
        view: 'table-cell',
        data: obj => obj[name]
    };
}

function resolveColConfig(name, config) {
    return typeof config === 'string'
        ? {
            data: self,
            content: config
        }
        : {
            data: hasOwnProperty.call(config, 'content') ? self : obj => obj[name],
            ...config
        };
}

export default function(discovery) {
    discovery.view.define('table', function(el, config, data, context) {
        let { cols, rowConfig, limit } = config;
        let colsMap = cols && typeof cols === 'object' ? cols : {};
        let scalarCol = false;

        if (!Array.isArray(data)) {
            data = data ? [data] : [];
        }

        const headEl = el.appendChild(document.createElement('thead'));
        const bodyEl = el.appendChild(document.createElement('tbody'));
        const moreEl = el
            .appendChild(document.createElement('tbody'))
            .appendChild(document.createElement('tr'))
            .appendChild(document.createElement('td'));

        if (Array.isArray(cols)) {
            cols = cols.map((def, idx) =>
                typeof def === 'string'
                    ? configFromName(def)
                    : {
                        header: 'col' + idx,
                        view: 'table-cell',
                        data: self,
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
                    data: data => String(data)
                });
            }

            colNames.forEach(name =>
                cols.push({
                    ...configFromName(name),
                    ...hasOwnProperty.call(colsMap, name)
                        ? resolveColConfig(name, colsMap[name])
                        : null
                })
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

            headEl.appendChild(createElement('th'))
                .textContent = col.header;
        }

        moreEl.colSpan = cols.length;
        discovery.view.renderList(bodyEl, this.composeConfig({
            view: 'table-row',
            cols
        }, rowConfig), data, context, 0, discovery.view.listLimit(limit, 25), moreEl);
    }, {
        tag: 'table'
    });
}
