/* eslint-env browser */
import usage from './checkbox.usage.js';

export default function(discovery) {
    discovery.view.define('checkbox', function(el, config, data, context) {
        const { name, checked, readonly, content, onInit, onChange } = config;
        const inputEl = el.appendChild(document.createElement('input'));
        let renderContent = null;

        inputEl.type = 'checkbox';
        inputEl.checked = checked !== undefined ? discovery.queryBool(checked, data, context) : Boolean(context[name]);
        inputEl.readOnly = readonly;
        inputEl.addEventListener('click', (e) => {
            if (readonly) {
                e.preventDefault();
            }
        });
        inputEl.addEventListener('change', () => {
            if (typeof onChange === 'function') {
                onChange(inputEl.checked, name, data, context);

                if (renderContent !== null) {
                    renderContent();
                }
            }
        });

        if (typeof onInit === 'function') {
            onInit(inputEl.checked, name, data, context);
        }

        if (content) {
            const contentEl = el.appendChild(document.createElement('span'));
            renderContent = () => {
                const localContext = name ? { ...context, [name]: inputEl.checked } : context;

                contentEl.innerHTML = '';
                return discovery.view.render(contentEl, content, data, localContext);
            };

            return renderContent();
        }
    }, {
        tag: 'label',
        usage
    });
}
