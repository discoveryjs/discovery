/* eslint-env browser */

import defined from '../core/utils/defined.js';
import safeFilterRx from '../core/utils/safe-filter-rx.js';

export default function(discovery) {
    const factories = {
        regexp: value => value ? safeFilterRx(value) : null,
        text: value => value
    };

    discovery.view.define('input', function(el, config, data, context) {
        const { name, value, type = 'text', placeholder, onInit, onChange, htmlType = 'text', htmlMin, htmlMax } = config;
        const factory = factories[type] || factories.text;
        const inputEl = el.appendChild(document.createElement('input'));
        let lastInput = defined([value, context[name]], '');

        inputEl.value = lastInput;
        inputEl.placeholder = (placeholder || '') + (factory !== factories.text ? ' (' + type + ')' : '');
        inputEl.type = htmlType;

        if (htmlMin) {
            inputEl.min = htmlMin;
        }

        if (htmlMax) {
            inputEl.max = htmlMax;
        }

        inputEl.addEventListener('input', () => {
            const newInput = inputEl.value.trim();

            if (lastInput !== newInput) {
                lastInput = newInput;

                if (typeof onChange === 'function') {
                    onChange(factory(newInput), name);
                }
            }
        });

        if (typeof onInit === 'function') {
            onInit(factory(inputEl.value.trim()), name);
        }
    });
}
