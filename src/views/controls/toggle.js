/* eslint-env browser */
import usage from './toggle-group.usage.js';

export default function(host) {
    host.view.define('toggle', function(el, config, data, context) {
        const {
            content,
            disabled = false,
            onToggle,
            value,
            text = String(value).replace(/^./, m => m.toUpperCase())
        } = config;
        let {
            checked = false
        } = config;

        if (disabled) {
            el.classList.add('disabled');
        } else if (typeof onToggle === 'function') {
            el.addEventListener('click', () => {
                checked = !checked;
                onToggle(checked, value);
            });
            el.classList.add('onclick');
        }

        if (checked) {
            el.classList.add('checked');
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    }, { usage });
}
