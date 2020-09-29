/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('columns', function render(el, config, data, context) {
        const { column, columnConfig, emptyText, limit } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            return discovery.view.renderList(el, this.composeConfig({
                view: 'column',
                content: column
            }, columnConfig), data, context, 0, discovery.view.listLimit(limit, 25));
        }
    });
}
