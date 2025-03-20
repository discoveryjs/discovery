/* eslint-env browser */

import usage from './blockquote.usage.js';

export default function(host) {
    function render(el, config, data, context) {
        const { content = 'text', kind } = config;

        if (typeof kind === 'string') {
            el.dataset.kind = kind;
        }

        return host.view.render(el, content, data, context);
    }

    host.view.define('blockquote', {
        tag: 'blockquote',
        render,
        usage
    });
}
