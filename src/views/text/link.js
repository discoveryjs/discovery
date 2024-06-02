/* eslint-env browser */
import usage from './link.usage.js';

const props = `is not array? | {
    text: #.props.content is undefined ? is string ?: text,
    content: undefined,
    href,
    external,
    onClick: undefined
} | overrideProps() | {
    $text; $href;
    ...,
    text: $text | is not undefined or no $href ?: $href,
    href: $href | is not undefined or no $text ?: $text
}`;

export default function(host) {
    host.view.define('link', function(el, props, data, context) {
        let {
            text,
            content,
            href,
            external,
            onClick
        } = props;

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
        props,
        usage
    });
}
