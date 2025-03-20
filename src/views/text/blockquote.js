/* eslint-env browser */

import usage from './blockquote.usage.js';

export default function(host) {
    function render(el, config, data, context) {
        const { content = 'text' } = config;

        return host.view.render(el, content, data, context);
    }

    host.view.define('blockquote', { tag: 'blockquote', render, usage });
}
