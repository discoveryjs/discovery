/* eslint-env browser */
import usage from './nav-button.usage.js';

export default function(host) {
    host.view.define('nav-button', function(el, config, data, context) {
        const { name, content, disabled = false, onClick } = config;
        const { text = '', href, external } = data || {};

        if (name) {
            el.dataset.name = name;
        }

        if (host.query(disabled, data, context)) {
            el.classList.add('disabled');
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', (event) => onClick(el, data, context, event));
            el.classList.add('onclick');
        } else if (href) {
            el.href = href;
            el.target = external ? '_blank' : '';
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
