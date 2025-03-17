import { isArray, isSet } from '../core/utils/is-type.js';
import { hasOwn } from '../core/utils/object-utils.js';

function configFromName(name, query) {
    return {
        header: name,
        view: 'table-cell',
        data: query
    };
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

export default function(host) {
    const isNotObject = host.queryFn('is not object');

    host.textView.define('table', async function(node, config, data, context) {
        let { rows, cols, limit = 25, valueCol = false } = config;
        let moreCount = 0;

        if ('rows' in config === false) {
            rows = data;
        }

        if (isSet(rows)) {
            rows = [...rows];
        }

        if (!isArray(rows)) {
            rows = rows ? [rows] : [];
        }

        if (limit !== false && rows.length > limit) {
            moreCount = rows.length - limit;
            rows = rows.slice(0, limit);
        }

        const headerCells = [];

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
                content: '=is not object ? "struct"',
                details: false
            });
        }

        cols = cols.filter(col =>
            !hasOwn(col, 'colWhen') || host.queryBool(col.colWhen, data, context)
        );

        if (!cols.length) {
            return node.appendText('\n<empty table>\n');
        }

        const renderedCells = Array.from(rows, () => []);
        const colWidths = [];
        for (const col of cols) {
            const headerText = String(col.header).trim();
            const headerWidth = headerText.length;
            let colWidth = headerWidth;

            for (let i = 0; i < rows.length; i++) {
                const cellTree = await this.render(null, col, rows[i], context);
                const cellWidth = host.textView.textWidth(cellTree);

                colWidth = Math.max(colWidth, cellWidth);
                renderedCells[i].push({
                    width: cellWidth,
                    align: col.align,
                    content: cellTree
                });
            }

            colWidths.push(colWidth);
            headerCells.push({
                width: headerWidth,
                content: await this.render(null, 'text', headerText)
            });
        }

        node.appendText('\n');
        drawLine(colWidths, '┌', '┬', '┐');
        drawRow(colWidths, headerCells, true);
        drawLine(colWidths, '├', '┼', '┤');

        for (const row of renderedCells) {
            drawRow(colWidths, row);
        }

        if (moreCount > 0) {
            const tableWidth = colWidths.reduce((w, cw) => w + cw + 3, 0) + 1;
            const text = ` ${moreCount} more rows… `;
            const pad = Math.max(1, tableWidth - text.length);
            node.appendText(`${'~'.repeat(Math.floor(1))}${text}${'~'.repeat(Math.ceil(pad - 1))}\n`);
        } else {
            drawLine(colWidths, '└', '┴', '┘');
        }

        function drawLine(colWidths, s, m, e) {
            let line = s + '─'.repeat((colWidths[0] || 0) + 2);

            for (let i = 1; i < colWidths.length; i++) {
                line += m + '─'.repeat(colWidths[i] + 2);
            }

            node.appendText(line + e + '\n');
        }

        function drawRow(maxFieldLen, cells) {
            for (let i = 0; i < cells.length; i++) {
                const { width, align, content } = cells[i];
                const pad = maxFieldLen[i] - width + 1;


                if (pad > 0 && align !== 'right') {
                    node.appendText('│ ');
                } else {
                    node.appendText('│' + ' '.repeat(pad));
                }

                node.append(content);

                if (pad > 0 && align === 'right') {
                    node.appendText(' ');
                } else {
                    node.appendText(' '.repeat(pad));
                }
            }

            node.appendText('│\n');
        }
    });

    host.textView.define('table-cell', function(node, config, data, context) {
        let { content, contentWhen = true } = config;
        const isDataObject =
            !content &&
            data !== null &&
            (Array.isArray(data) ? data.length > 0 : typeof data === 'object') &&
            data instanceof RegExp === false;

        if (!host.queryBool(contentWhen, data, context)) {
            return;
        }

        if (content) {
            return host.textView.render(node, content, data, context);
        }

        node.appendText(defaultCellRender(data, isDataObject));
    });
}

function defaultCellRender(data, isDataObject) {
    if (Array.isArray(data) || ArrayBuffer.isView(data)) {
        return data.length || '';
    }

    if (isDataObject) {
        for (let k in data) {
            if (hasOwn(data, k)) {
                return '{…}';
            }
        }

        return '{}';
    }

    if (data === undefined) {
        return '';
    }

    return String(data);
}
