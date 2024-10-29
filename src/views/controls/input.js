/* eslint-env browser */
import { safeFilterRx } from '../../core/utils/safe-filter-rx.js';
import { debounce as debounceFn } from '../../core/utils/debounce.js';
import usage from './input.usage.js';

export default function(host) {
    const factories = {
        regexp: pattern => pattern ? safeFilterRx(pattern) : null,
        text: pattern => pattern
    };

    host.view.define('input', function(el, config, data, context) {
        const {
            name,
            value,
            type = 'text',
            placeholder,
            onInit,
            onChange,
            htmlType = 'text',
            htmlMin,
            htmlMax,
            debounce
        } = config;
        const factory = factories[type] || factories.text;
        const inputEl = el.appendChild(document.createElement('input'));
        let lastInput = value ? host.query(value, data, context) : context[name];

        if (typeof lastInput !== 'string') {
            lastInput = '';
        }

        inputEl.type = htmlType;
        inputEl.value = lastInput;
        inputEl.placeholder = [
            placeholder || '',
            factory !== factories.text ? '(' + type + ')' : ''
        ].filter(Boolean).join(' ');

        if (typeof htmlMin !== 'undefined') {
            inputEl.min = htmlMin;
        }

        if (htmlMax) {
            inputEl.max = htmlMax;
        }

        inputEl.addEventListener('input', debounceFn(() => {
            const newInput = inputEl.value.trim();

            if (lastInput !== newInput) {
                lastInput = newInput;

                if (typeof onChange === 'function') {
                    onChange(factory(newInput), name, data, context);
                }
            }
        }, debounce));

        if (typeof onInit === 'function') {
            onInit(factory(inputEl.value.trim()), name, data, context);
        }
    }, { usage });
}
