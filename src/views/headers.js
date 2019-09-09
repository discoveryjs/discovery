/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { content } = config;

        discovery.view.render(el, content || 'text', data, context);
    }

    discovery.view.define('header', render, { tag: 'h2' });
    discovery.view.define('h1', render, { tag: 'h1' });
    discovery.view.define('h2', render, { tag: 'h2' });
    discovery.view.define('h3', render, { tag: 'h3' });
    discovery.view.define('h4', render, { tag: 'h4' });
    discovery.view.define('h5', render, { tag: 'h5' });
}
