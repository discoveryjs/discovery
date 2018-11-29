/* eslint-env browser */

const hasOwnProperty = Object.prototype.hasOwnProperty;

function configFromName(name) {
    return {
        header: name,
        view: 'table-cell',
        data: obj => obj[name]
    };
}

function resolveColConfig(config) {
    return typeof config === 'string' ? { data: data => data, content: config } : Object.assign({ data: data=>data },config);
}

export default function(discovery) {
    discovery.view.define('table', function(el, config, data, context) {
        const limit = isNaN(config.limit) ? 25 : parseInt(config.limit, 10);
        let { cols } = config;
        let colsMap = cols && typeof cols === 'object' ? cols : {};
        let scalarCol = false;

        if (!Array.isArray(data) && data) {
            data = [data];
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
                    : Object.assign({
                        header: 'col' + idx,
                        view: 'table-cell',
                        data: data => data
                    }, def)
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
                cols.push(Object.assign(
                    configFromName(name),
                    hasOwnProperty.call(colsMap, name) ? resolveColConfig(colsMap[name]) : null
                ))
            );
        } else {
            console.warn('config.cols and data is not an array, no way to build a table');
            return;
        }

        cols.forEach(col =>
            headEl.appendChild(document.createElement('th')).innerText = col.header
        );

        moreEl.colSpan = 1000;
        discovery.view.renderList(bodyEl, {
            view: 'table-row',
            cols
        }, data, context, 0, limit, moreEl);
    });
}
