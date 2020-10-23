/* eslint-env browser */
import usage from './text.usage.js';

export default function(discovery) {
    discovery.view.define('text', function(el, config, data) {
        el.appendChild(document.createTextNode(String(data)));
    }, {
        tag: false,
        usage
    });
}
