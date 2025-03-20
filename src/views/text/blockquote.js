/* eslint-env browser */

import usage from './blockquote.usage.js';

export default function(host) {
    function render(el, config, data, context) {
        const { content = 'text', kind } = config;

        if (typeof kind === 'string' && /\S/.test(kind)) {
            el.dataset.kind = kind.trim();
        }

        return host.view.render(el, content, data, context);
    }

    host.view.define('blockquote', {
        tag: 'blockquote',
        render,
        usage
    });
}
