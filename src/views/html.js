/* eslint-env browser */
import usage from './html.usage.js';

export default function(host) {
    const buffer = document.createElement('div');

    host.view.define('html', function(el, config, data) {
        buffer.innerHTML = data;
        el.append(...buffer.childNodes);
    }, {
        tag: null,
        usage
    });
}
