import { isArray, isSet } from '../core/utils/is-type.js';
import { hasOwn } from '../core/utils/object-utils.js';
import usage from './table.usage.js';

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
        let { rows, cols, valueCol = false, headerWhen = true, footerWhen = true, limit = 25 } = config;
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
                details: false
            });
        }

        cols = cols.filter(col =>
            !hasOwn(col, 'colWhen') || host.queryBool(col.colWhen, data, context)
        );

        if (!cols.length) {
            return node.appendText('\n<empty table>\n');
        }

        const shouldRenderHeader = host.query(headerWhen, data, context);
        const shouldRenderFooter = host.query(footerWhen, data, context);
        const renderedCells = Array.from(rows, () => []);
        const colWidths = [];
        const footerCells = [];
        for (const col of cols) {
            const headerText = String(col.header).trim();
            let colWidth = 0;

            if (shouldRenderHeader) {
                const headerContent = await this.render(null, 'text', headerText);
                const headerWidth = host.textView.textWidth(headerContent);

                colWidth = Math.max(colWidth, headerWidth);
                headerCells.push({
                    width: headerWidth,
                    content: headerContent
                });
            }

            for (let i = 0; i < rows.length; i++) {
                const cellContent = await this.render(null, col, rows[i], context);
                const cellWidth = host.textView.textWidth(cellContent);

                colWidth = Math.max(colWidth, cellWidth);
                renderedCells[i].push({
                    width: cellWidth,
                    align: col.align,
                    content: cellContent
                });
            }

            if (shouldRenderFooter && col.footer) {
                const config = typeof col.footer === 'object' && col.footer !== null && !hasOwn(col.footer, 'view')
                    ? col.footer
                    : { content: col.footer };
                const { align, ...renderConfig } = config;
                const cellContent = await this.render(null, this.composeConfig('block', renderConfig), data, context);
                const cellWidth = host.textView.textWidth(cellContent);

                colWidth = Math.max(colWidth, cellWidth);
                footerCells.push({
                    width: cellWidth,
                    align,
                    content: cellContent
                });
            } else {
                footerCells.push(null);
            }

            colWidths.push(colWidth);
        }

        drawLine(colWidths, '┌', '┬', '┐');

        if (shouldRenderHeader) {
            drawRow(colWidths, headerCells);
            drawLine(colWidths, '├', '┼', '┤');
        }

        for (const row of renderedCells) {
            drawRow(colWidths, row);
        }

        if (moreCount > 0) {
            const tableWidth = colWidths.reduce((w, cw) => w + cw + 3, 0) + 1;
            const text = ` ${moreCount} more rows… `;
            const pad = Math.max(1, tableWidth - text.length);

            node.appendLine().appendText(`${'~'.repeat(Math.floor(1))}${text}${'~'.repeat(Math.ceil(pad - 1))}`);

            if (shouldRenderFooter && footerCells.some(cell => cell !== null)) {
                drawLine(colWidths, '├', '┼', '┤');
                drawRow(colWidths, footerCells);
                drawLine(colWidths, '└', '┴', '┘');
            }
        } else {
            if (shouldRenderFooter && footerCells.some(cell => cell !== null)) {
                drawLine(colWidths, '├', '┼', '┤');
                drawRow(colWidths, footerCells);
            }

            drawLine(colWidths, '└', '┴', '┘');
        }

        function drawLine(colWidths, s, m, e) {
            let line = s + '─'.repeat((colWidths[0] || 0) + 2);

            for (let i = 1; i < colWidths.length; i++) {
                line += m + '─'.repeat(colWidths[i] + 2);
            }

            node.appendLine().appendText(line + e);
        }

        function drawRow(maxFieldLen, cells) {
            const line = node.appendLine();

            for (let i = 0; i < cells.length; i++) {
                const { width = 0, align, content = '' } = cells[i] || {};
                const pad = maxFieldLen[i] - width + 1;


                if (pad > 0 && align !== 'right') {
                    line.appendText('│ ');
                } else {
                    line.appendText('│' + ' '.repeat(pad));
                }

                line.append(content);

                if (pad > 0 && align === 'right') {
                    line.appendText(' ');
                } else {
                    line.appendText(' '.repeat(pad));
                }
            }

            line.appendText('│');
        }
    }, { type: 'block', usage });

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
