/* eslint-env browser */
import usage from './nav-button.usage.js';

const props = `is not array? | {
    name: undefined,
    text: #.props has no 'content' ? is (string or number or boolean) ?: text,
    content: undefined,
    disabled: false,
    href,
    external,
    onClick: undefined
} | overrideProps()`;

export default function(host) {
    host.view.define('nav-button', function(el, props, data, context) {
        const {
            name,
            text,
            content,
            disabled,
            href,
            external,
            onClick
        } = props;

        if (name) {
            el.dataset.name = name;
        }

        if (disabled) {
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
        props,
        usage
    });
}
