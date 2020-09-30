/* eslint-env browser */
import usage from './text-match.usage.js';

const toString = Object.prototype.toString;

export default function(discovery) {
    const matchWrapperEl = document.createElement('span');
    matchWrapperEl.className = 'view-text-match';

    discovery.view.define('text-match', function(el, config, data) {
        const { text, match } = data;
        const parts = toString.call(match) === '[object RegExp]'
            ? String(text).split(match)
            : [String(text)];

        parts.forEach((text, idx) => {
            if (text !== '') {
                let container = el;

                if (idx % 2) {
                    container = container.appendChild(matchWrapperEl.cloneNode());
                }

                container.appendChild(document.createTextNode(text));
            }
        });
    }, {
        tag: false,
        usage
    });
}
