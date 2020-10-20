/* eslint-env browser */
import usage from './text-match.usage.js';

const toString = Object.prototype.toString;
const rxChars = /[\\^$.*+?()[\]{}|]/g;

function prepare(string) {
    return string.replace(rxChars, '\\$&')
}

export default function(discovery) {
    const matchWrapperEl = document.createElement('span');
    matchWrapperEl.className = 'view-text-match';

    discovery.view.define('text-match', function(el, config, data) {
        const { text, match } = data;
        let regexp = match;

        if (toString.call(match) !== '[object RegExp]' && match) {
            regexp = new RegExp(`(${prepare(String(match))})`);
        }

        const parts = regexp
            ? String(text).split(regexp)
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
