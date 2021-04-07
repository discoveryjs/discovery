/* eslint-env browser */
import usage from './link.usage.js';

export default function(host) {
    host.view.define('link', function(el, config, data, context) {
        const { content, onClick } = config;
        let { href, text, external } = data || {};

        if (typeof data === 'string') {
            href = text = data;
        }

        if (text === undefined && href) {
            text = href;
        } else if (href === undefined && text) {
            href = text;
        }

        if (href) {
            el.href = href;
        }

        if (external) {
            el.setAttribute('target', '_blank');
        }

        if (typeof onClick === 'function') {
            el.classList.add('onclick');
            el.addEventListener('click', (e) => {
                e.preventDefault();
                onClick(el, data, context);
            });
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    }, {
        tag: 'a',
        usage
    });
}
