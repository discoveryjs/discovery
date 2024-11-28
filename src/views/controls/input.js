/* eslint-env browser */
import { safeFilterRx } from '../../core/utils/safe-filter-rx.js';
import { debounce as debounceFn } from '../../core/utils/debounce.js';
import usage from './input.usage.js';

const props = `#.props | {
    name,
    value: $ has no 'value' and name is string ? #.context[name] : value | is (string or number) ?: '',
    type ?: 'text',
    placeholder,
    onInit,
    onChange,
    htmlType ?: 'text',
    htmlMin,
    htmlMax,
    htmlStep,
    debounce
}`;

export default function(host) {
    const factories = {
        regexp: pattern => pattern ? safeFilterRx(pattern) : null,
        text: pattern => pattern
    };

    host.view.define('input', function(el, config, data, context) {
        const {
            name,
            value,
            type,
            placeholder,
            onInit,
            onChange,
            htmlType,
            htmlMin,
            htmlMax,
            htmlStep,
            debounce
        } = config;
        const factory = factories[type] || factories.text;
        const inputEl = el.appendChild(document.createElement('input'));
        let lastValue = value;

        if (Number.isFinite(htmlMin)) {
            inputEl.min = htmlMin;
        }

        if (Number.isFinite(htmlMax)) {
            inputEl.max = htmlMax;
        }

        if (Number.isFinite(htmlStep)) {
            inputEl.step = htmlStep;
        }

        inputEl.type = htmlType;
        inputEl.value = lastValue; // set the value once min, max, and step are established; otherwise, the value might be normalized using default settings
        inputEl.placeholder = [
            placeholder || '',
            factory !== factories.text ? '(' + type + ')' : ''
        ].filter(Boolean).join(' ');

        inputEl.addEventListener('input', debounceFn(() => {
            const newValue = inputEl.value.trim();

            if (lastValue !== newValue) {
                lastValue = newValue;

                if (typeof onChange === 'function') {
                    onChange(factory(newValue), name, data, context);
                }
            }
        }, debounce));

        if (typeof onInit === 'function') {
            onInit(factory(inputEl.value.trim()), name, data, context);
        }
    }, { usage, props });
}
