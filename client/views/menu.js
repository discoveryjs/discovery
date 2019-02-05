/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('menu', function(el, config, data, context) {
        const { item, limit, emptyText, onClick } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'No items');
        }

        if (Array.isArray(data)) {
            discovery.view.renderList(el, {
                view: 'menu-item',
                content: item,
                onClick
            }, data, context, 0, discovery.view.listLimit(limit, 25));
        }
    });
}
