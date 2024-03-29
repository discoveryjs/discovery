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
        text: is (string or number or boolean) ?: text,
        content: #.content,
        href,
        external,
        prefix,
        postfix,
        hint
    } | entries().({
        key,
        value: #[key] != undefined ? #[key] : value
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
            prefix,
            postfix,
            hint
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
            el.target = '_blank';
        }

        if (hint) {
            el.title = hint;
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
