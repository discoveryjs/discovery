/* eslint-env browser */
import usage from './menu-item.usage.js';

export default function(discovery) {
    discovery.view.define('menu-item', function(el, config, data, context) {
        const { content, onClick } = config;
        const { text, selected = false, disabled = false, href, external } = data || {};

        if (disabled) {
            el.classList.add('disabled');
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(data, context));
            el.classList.add('onclick');
        } else if (href) {
            el.href = href;
            el.target = external ? '_blank' : '';
        }

        if (selected) {
            el.classList.add('selected');
        }

        if (content) {
            return discovery.view.render(el, content, data, context);
        } else {
            el.textContent = typeof data === 'string' ? data : text || 'Untitled item';
        }
    }, {
        tag: 'a',
        usage
    });
}
