/* eslint-env browser */
import usage from './headers.usage.js';

export default function(discovery) {
    function render(el, config, data, context) {
        const { content } = config;

        discovery.view.render(el, content || 'text', data, context);
    }

    discovery.view.define('header', render, { tag: 'h2', usage });
    discovery.view.define('h1', render, { tag: 'h1', usage });
    discovery.view.define('h2', render, { tag: 'h2', usage });
    discovery.view.define('h3', render, { tag: 'h3', usage });
    discovery.view.define('h4', render, { tag: 'h4', usage });
    discovery.view.define('h5', render, { tag: 'h5', usage });
}
