/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('tab', function(el, config, data, context) {
        const {
            content,
            active = false,
            disabled = false,
            onClick,
            value,
            text = value
        } = config;

        if (discovery.query(disabled, data, context)) {
            el.classList.add('disabled');
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(value));
            el.classList.add('onclick');
        }

        if (active) {
            el.classList.add('active');
        }

        if (content) {
            return discovery.view.render(el, content, data, context);
        } else {
            el.textContent = text;
        }
    });
}
