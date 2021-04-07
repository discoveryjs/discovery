/* eslint-env browser */
import usage from './columns.usage.js';

export default function(host) {
    host.view.define('columns', function render(el, config, data, context) {
        const { column, columnConfig, emptyText, limit } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            return host.view.renderList(el, this.composeConfig({
                view: 'column',
                content: column
            }, columnConfig), data, context, 0, host.view.listLimit(limit, 25));
        }
    }, { usage });
}
