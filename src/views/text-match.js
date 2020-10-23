/* eslint-env browser */
import usage from './text-match.usage.js';
import { createElement, createText } from '../core/utils/dom.js';

const { toString } = Object.prototype;
const matchWrapperEl = createElement('span', 'view-text-match');
const matchWithRx = (str, pattern) => {
    const match = str.match(pattern);
    
    return match && { offset: match.index, match: match[0].length };
}
const matchWithString = (str, pattern) => {
    const offset = str.indexOf(pattern);
    
    return offset === -1 ? null : { offset, match: pattern.length };
}

export default function(discovery) {
    discovery.view.define('text-match', function(el, config, data) {
        const { text, match } = data;
        const next = toString.call(match) === '[object RegExp]' ? matchWithRx : matchWithString;
        let tail = String(text);

        do {
            const part = next(tail, match);

            if (part === null) {
                el.appendChild(createText(tail));
                break;
            }

            if (part.offset !== 0) {
                el.appendChild(createText(tail.slice(0, part.offset)));
            }

            if (part.match !== 0) {
                el
                    .appendChild(matchWrapperEl.cloneNode())
                    .appendChild(createText(tail.substr(part.offset, part.match)));
            }

            tail = tail.slice(part.offset + part.match || 1);
        } while (true);
    }, {
        tag: false,
        usage
    });
}
