/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('tab', function(el, config, data, context) {
        const { content, active, onClick } = config;
        const { text, value } = data;

        if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(value));
        }

        if (active) {
            el.classList.add('active');
        }

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            el.innerText = text || value;
        }
    });
}
