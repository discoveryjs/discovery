/* eslint-env browser */
import usage from './html.usage.js';

export default function(discovery) {
    const buffer = document.createElement('div');

    discovery.view.define('html', function(el, config, data) {
        buffer.innerHTML = data;
        el.append(...buffer.childNodes);
    }, {
        tag: null,
        usage
    });
}
