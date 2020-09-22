/* eslint-env browser */
import usage from './indicator.usage.js';

export default function(discovery) {
    discovery.view.define('indicator', function(el, config, data, context) {
        const { value, label } = config;
        const { href } = data || {};
        const valueEl = el.appendChild(document.createElement('div'));
        const labelEl = el.appendChild(document.createElement('div'));

        valueEl.className = 'value';
        discovery.view.render(valueEl, value || 'text:value', data, context);

        labelEl.className = 'label';
        discovery.view.render(labelEl, label || 'text:label', data, context);

        if (href) {
            el.href = href;
        }
    }, {
        tag: 'a',
        usage
    });
}
