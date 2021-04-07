/* eslint-env browser */
import usage from './checkbox.usage.js';
import { createElement } from '../core/utils/dom.js';

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
        inputEl.checked = checked !== undefined ? host.queryBool(checked, data, context) : Boolean(context[name]);
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
        usage
    });
}
