/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { item = 'text', limit: configLimit, emptyText } = config;
        const limit = isNaN(configLimit) ? 25 : parseInt(configLimit, 10);

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty list');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            discovery.view.renderList(el, {
                view: 'list-item',
                content: item
            }, data, context, 0, limit);
        }
    }

    discovery.view.define('list', render);
    discovery.view.define('inline-list', render);
    discovery.view.define('comma-list', render);
    discovery.view.define('ol', render, { tag: 'ol' });
    discovery.view.define('ul', render, { tag: 'ul' });
}
