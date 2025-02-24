/* eslint-env browser */
import usage from './tab.usage.js';

const props = `is not array? | {
    value,
    text: #.props has no 'content' ? is (string or number or boolean) ?,
    content: undefined,
    active: undefined,
    disabled: undefined,
    onClick: undefined
} | overrideProps() | {
    ...,
    text: text is not undefined ? text : value,
    active is truthy,
    disabled is truthy
}`;

export default function(host) {
    host.view.define('tab', function(el, props, data, context) {
        const {
            value,
            text,
            content,
            active,
            disabled,
            onClick
        } = props;

        if (disabled) {
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
            el.textContent = String(text);
        }
    }, { usage, props });
}
