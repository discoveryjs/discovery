/* eslint-env browser */

import usage from './button.usage.js';
import { createElement } from '../../core/utils/dom.js';

const props = `is not array? | {
    text: #.props has no 'content' ? is (string or number or boolean) ?: text,
    content: undefined,
    disabled: false,
    href,
    external,
    onClick: undefined
} | overrideProps()`;

export default function(host) {
    function render(el, props, data, context) {
        const {
            text,
            content,
            disabled,
            href,
            external,
            onClick
        } = props;

        el.classList.add('view-button');

        if (disabled) {
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

    host.view.define('button', render, { tag: 'button', props, usage });
    host.view.define('button-primary', render, { tag: 'button', props, usage });
    host.view.define('button-danger', render, { tag: 'button', props, usage });
    host.view.define('button-warning', render, { tag: 'button', props, usage });
}
