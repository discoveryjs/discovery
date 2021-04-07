/* eslint-env browser */

import usage from './alerts.usage.js';

export default function(host) {
    function render(el, config, data, context) {
        const { content = 'text' } = config;

        el.classList.add('view-alert');

        return host.view.render(el, content, data, context);
    }

    host.view.define('alert', render, { usage });
    host.view.define('alert-success', render, { usage });
    host.view.define('alert-danger', render, { usage });
    host.view.define('alert-warning', render, { usage });
}
