/* eslint-env browser */

import usage from './button.usage.js';
import { createElement } from '../../core/utils/dom.js';

export default function(host) {
    function render(el, config, data, context) {
        const { content, disabled = false, onClick } = config;
        const { text = '', href, external } = data || {};

        el.classList.add('view-button');

        if (host.query(disabled, data, context)) {
            el.disabled = true;
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(el, data, context));
            el.classList.add('onclick');
        } else if (href) {
            el.addEventListener('click', () => createElement('a', {
                href,
                target: external ? '_blank' : ''
            }).click());
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    }

    host.view.define('button', render, { tag: 'button', usage });
    host.view.define('button-primary', render, { tag: 'button', usage });
    host.view.define('button-danger', render, { tag: 'button', usage });
    host.view.define('button-warning', render, { tag: 'button', usage });
}
