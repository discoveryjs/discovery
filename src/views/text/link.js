/* eslint-env browser */
import usage from './link.usage.js';

export default function(host) {
    const prepareProps = host.queryFn(`is not array? | {
        text: #.content is undefined ? is string ?: text,
        content: #.content,
        href,
        external,
        onClick: #.onClick
    } | entries().({
        key,
        value: # has key ? #[key] : value
    }).fromEntries() | {
        $text; $href;
        ...,
        text: $text | is not undefined or no $href ?: $href,
        href: $href | is not undefined or no $text ?: $text
    }`);

    host.view.define('link', function(el, config, data, context) {
        let {
            text,
            content,
            href,
            external,
            onClick
        } = prepareProps(data, config);

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
