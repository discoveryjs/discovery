/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('menu-item', function(el, config, data, context) {
        const { content, onClick } = config;
        const { text, selected = false, disabled = false } = data;

        if (disabled) {
            el.classList.add('disabled');
        } else if (typeof onClick === 'function') {
            el.addEventListener('click', () => onClick(data));
        }

        if (selected) {
            el.classList.add('selected');
        }

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            el.innerText = typeof data === 'string' ? data : text || 'Untitled item';
        }
    });
}
