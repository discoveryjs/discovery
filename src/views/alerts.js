/* eslint-env browser */

import usage from './alerts.usage.js';

export default function(discovery) {
    function render(el, config, data, context) {
        const { content } = config;

        discovery.view.render(el, content || 'text', data, context);
    }

    discovery.view.define('alert', render, { usage });
    discovery.view.define('alert-success', render, { usage });
    discovery.view.define('alert-danger', render, { usage });
    discovery.view.define('alert-warning', render, { usage });
}
