/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('auto-link', function(el, config, data, context) {
        const { content } = config;

        if (!data) {
            return;
        }

        const links = discovery.resolveValueLinks(data);

        if (links) {
            discovery.view.render(el, { view: 'link', content }, links[0], context);
        } else {
            discovery.view.render(el, content || 'text', data, context);
        }
    }, {
        tag: false
    });
}
