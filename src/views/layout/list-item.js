/* eslint-env browser */

export default function(host) {
    host.view.define('list-item', function(el, config, data, context) {
        const { content = 'text' } = config;

        return host.view.render(el, content, data, context);
    }, {
        tag: 'li'
    });
}
