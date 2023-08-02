/* eslint-env browser */
import usage from './tab.usage.js';

export default function(host) {
    host.view.define('tab', function(el, config, data, context) {
        const {
            content,
            active = false,
            disabled = false,
            onClick,
            value,
            text = String(value).replace(/^./, m => m.toUpperCase())
        } = config;

        if (host.query(disabled, data, context)) {
            el.classList.add('disabled');
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(value));
            el.classList.add('onclick');
        }

        if (active) {
            el.classList.add('active');
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    }, { usage });
}
