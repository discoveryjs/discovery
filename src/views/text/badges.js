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

export default function(host) {
    const prepareProps = host.queryFn(`is not array? | {
        color,
        textColor,
        darkColor,
        darkTextColor,
        text: # has no 'content' ? is (string or number or boolean) ?: text,
        content: #.content,
        href,
        external,
        onClick: #.onClick,
        prefix,
        postfix
    } | entries().({
        key,
        value: # has key ? #[key] : value
    }).fromEntries()`);

    function render(el, config, data, context) {
        const {
            color,
            textColor,
            darkColor,
            darkTextColor,
            text,
            content,
            href,
            external,
            onClick,
            prefix,
            postfix
        } = prepareProps(data, config);
        let render;

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

        maybeFix(el, 'prefix', prefix);

        if (content) {
            render = this.render(el, content, data, context);
        } else {
            el.append(document.createTextNode(text));
        }

        maybeFix(el, 'postfix', postfix);

        return render;
    }

    host.view.define('badge', render, { tag: 'a', usage });
    host.view.define('pill-badge', render, { tag: 'a', usage });
}
