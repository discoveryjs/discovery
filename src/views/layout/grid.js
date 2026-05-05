/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import usage from './grid.usage.js';

const props = `is not array? | {
    rows is array?,
    gap: undefined,
    rowConfig,
    columnTemplate: undefined,
    onInit: undefined,
    onChange: undefined
} | overrideProps() | {
    ...,
    rows is array ?: data is array ?
}`;

export default function(host) {
    host.view.define('grid', function(el, config, data, context) {
        const dataRows = Array.isArray(data) ? data : [];
        const { rows = dataRows, rowConfig, gap, columnTemplate, onInit, onChange } = config;
        const renders = [];
        const handlers = {
            ...typeof onInit === 'function' ? { onInit } : undefined,
            ...typeof onChange === 'function' ? { onChange } : undefined
        };

        if (gap) {
            el.style.setProperty('--grid-gap', gap);
        }

        if (Array.isArray(rows)) {
            const rowBlueprint = Array.isArray(rowConfig)
                ? rowConfig.map(config => this.composeConfig(config, handlers))
                : null;
            const maxColCount = rowConfig
                ? rowBlueprint.length
                : rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

            el.style.setProperty('--grid-column-template', columnTemplate || 'auto '.repeat(maxColCount - 1) + '1fr');

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowEl = el.appendChild(createElement('div', 'grid__row'));
                const rowCells = Array.isArray(row) ? row : [];

                for (let j = 0; j < maxColCount; j++) {
                    const cellEl = rowEl.appendChild(createElement('div', 'grid__cell'));
                    if (rowBlueprint) {
                        renders.push(this.render(cellEl, rowBlueprint[j], data[i], context));
                    } else {
                        renders.push(this.render(cellEl,
                            this.composeConfig(rowCells[j], handlers),
                            data,
                            context
                        ));
                    }
                }
            }
        }

        return Promise.all(renders);
    }, { usage, props });
}
