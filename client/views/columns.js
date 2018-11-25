/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { column = 'text', emptyText, limit: configLimit } = config;
        const limit = isNaN(configLimit) ? 25 : parseInt(configLimit, 10);

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
            }, data, context, 0, limit);
        }
    }

    discovery.view.define('columns', render);
    discovery.view.define('column', function(el, config, data, context) {
        discovery.view.render(el, config.content, data, context);
    });
}
