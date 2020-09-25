/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('tab', function(el, config, data, context) {
        const { content, active = false, onClick } = config;
        const { text, value, disabled = false } = data || {};
        console.log(data);

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
            el.textContent = data && 'text' in data ? text : value;
        }
    });
}
