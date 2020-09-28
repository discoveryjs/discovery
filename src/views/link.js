/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('link', function(el, config, data, context) {
        const { content } = config;
        let { href, text, external } = data || {};

        if (typeof data === 'string') {
            href = text = data;
        }

        if (!text && href) {
            text = href;
        } else if (!href && text) {
            href = text;
        }

        el.href = href;

        if (external) {
            el.setAttribute('target', '_blank');
        }

        if (content) {
            return discovery.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    }, {
        tag: 'a'
    });
}
