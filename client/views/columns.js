/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { column = 'text', emptyText, limit } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            discovery.view.renderList(el, {
                view: 'column',
                content: column
            }, data, context, 0, discovery.view.listLimit(limit, 25));
        }
    }

    discovery.view.define('columns', render);
    discovery.view.define('column', function(el, config, data, context) {
        discovery.view.render(el, config.content, data, context);
    });
}
