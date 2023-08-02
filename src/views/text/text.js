/* eslint-env browser */
import usage from './text.usage.js';

export default function(host) {
    host.view.define('text', function(el, config, data) {
        el.appendChild(document.createTextNode(String(data)));
    }, {
        tag: false,
        usage
    });
}
