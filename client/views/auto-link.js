/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('auto-link', function(el, config, data, context) {
        if (!data) {
            return;
        }

        const links = discovery.resolveValueLinks(data);

        if (links) {
            discovery.view.render(el, 'link', links[0], context);
        } else {
            discovery.view.render(el, 'text', data, context);
        }
    }, {
        tag: false
    });
}
