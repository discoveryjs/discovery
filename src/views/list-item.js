/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('list-item', function(el, config, data, context) {
        const { content = 'text' } = config;

        return discovery.view.render(el, content, data, context);
    }, {
        tag: 'li'
    });
}
