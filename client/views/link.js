/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('link', function(el, config, data, context) {
        const { content } = config;
        const { href, text, external } = data || {};

        el.href = href;

        if (external) {
            el.setAttribute('target', '_blank');
        }

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            el.appendChild(document.createTextNode(String(text)));
        }
    }, {
        tag: 'a'
    });
}
