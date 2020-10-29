/* eslint-env browser */
import usage from './indicator.usage.js';

export default function(discovery) {
    discovery.view.define('indicator', function(el, config, data, context) {
        const { value, label } = config;
        const { href } = data || {};
        const valueEl = document.createElement('div');
        const labelEl = document.createElement('div');

        valueEl.className = 'value';
        labelEl.className = 'label';

        if (href) {
            el.href = href;
        }

        return Promise.all([
            discovery.view.render(valueEl, value || 'text:value', data, context),
            discovery.view.render(labelEl, label || 'text:label', data, context)
        ]).then(() => el.append(valueEl, labelEl));
    }, {
        tag: 'a',
        usage
    });
}
