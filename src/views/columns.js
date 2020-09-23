/* eslint-env browser */
import usage from './columns.usage.js';

export default function(discovery) {
    function render(el, config, data, context) {
        const { column = 'text', columnConfig, emptyText, limit } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            discovery.view.renderList(el, this.composeConfig({
                view: 'column',
                content: column
            }, columnConfig), data, context, 0, discovery.view.listLimit(limit, 25));
        }
    }

    discovery.view.define('columns', render, { usage });
    discovery.view.define('column', function(el, config, data, context) {
        discovery.view.render(el, config.content, data, context);
    }, { usage });
}
