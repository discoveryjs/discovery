/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('menu', function(el, config, data, context) {
        const { item, onClick } = config;

        if (Array.isArray(data)) {
            discovery.view.renderList(el, {
                view: 'menu-item',
                content: item,
                onClick
            }, data, context);
        }
    });
}
