/* eslint-env browser */
import usage from './badges.usage.js';

function maybeFix(el, type, value) {
    if (!value) {
        return;
    }

    const prefixEl = el.appendChild(document.createElement('span'));

    prefixEl.className = type;
    prefixEl.textContent = value;
}

export default function(discovery) {
    function render(el, config, data, context) {
        const { content } = config;
        let { color, textColor, darkColor, darkTextColor, text, href, prefix, postfix, hint } = data || {};

        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            text = data;
        }

        if (color) {
            el.style.setProperty('--discovery-view-badge-color', color);
        }

        if (darkColor) {
            el.style.setProperty('--discovery-view-badge-dark-color', darkColor);
        }

        if (textColor) {
            el.style.setProperty('--discovery-view-badge-text-color', textColor);
        }

        if (darkTextColor) {
            el.style.setProperty('--discovery-view-badge-dark-text-color', darkTextColor);
        }

        if (href) {
            el.href = href;
        }

        if (hint) {
            el.title = hint;
        }

        maybeFix(el, 'prefix', prefix);

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            el.appendChild(document.createTextNode(String(text)));
        }

        maybeFix(el, 'postfix', postfix);
    }

    discovery.view.define('badge', render, { tag: 'a', usage });
    discovery.view.define('pill-badge', render, { tag: 'a', usage });
}
