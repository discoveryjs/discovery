/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import usage from './checkbox.usage.js';

const props = `#.props | {
    name: undefined,
    checked: undefined,
    readonly: undefined,
    content: undefined,
    onInit: undefined,
    onChange: undefined
} | overrideProps() | {
    ...,
    checked is truthy,
    readonly is truthy
}`;

export default function(host) {
    function renderContent(contentEl, content, data, context, name, inputEl) {
        if (contentEl === null) {
            return;
        }

        const localContext = name ? { ...context, [name]: inputEl.checked } : context;

        contentEl.innerHTML = '';
        return host.view.render(contentEl, content, data, localContext);
    }

    host.view.define('checkbox', function(el, config, data, context) {
        const { name, checked, readonly, content, onInit, onChange } = config;
        const inputEl = el.appendChild(createElement('input'));
        const contentEl = content ? el.appendChild(createElement('span', 'view-checkbox__label')) : null;

        inputEl.type = 'checkbox';
        inputEl.checked = checked;
        inputEl.readOnly = readonly;
        inputEl.addEventListener('click', (e) => {
            if (readonly) {
                e.preventDefault();
            }
        });
        inputEl.addEventListener('change', () => {
            if (typeof onChange === 'function') {
                onChange(inputEl.checked, name, data, context);
                renderContent(contentEl, content, data, context, name, inputEl);
            }
        });

        if (typeof onInit === 'function') {
            onInit(inputEl.checked, name, data, context);
        }

        return renderContent(contentEl, content, data, context, name, inputEl);
    }, {
        tag: 'label',
        props,
        usage
    });
}
