/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { content, disabled = false, onClick } = config;
        const { text = '' } = data || {};

        el.classList.add('view-button');
        el.disabled = discovery.query(disabled, data, context);
        el.addEventListener('click', () => {
            if (typeof onClick === 'function') {
                onClick(el, data, context);
            }
        });

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            el.innerText = text;
        }
    }

    discovery.view.define('button', render, { tag: 'button' });
    discovery.view.define('button-primary', render, { tag: 'button' });
    discovery.view.define('button-danger', render, { tag: 'button' });
    discovery.view.define('button-warning', render, { tag: 'button' });
}
