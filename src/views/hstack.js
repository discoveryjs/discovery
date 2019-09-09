/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('hstack', function(el, config, data, context) {
        const { content } = config;

        discovery.view.render(el, content, data, context);
    });
}
