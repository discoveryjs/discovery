/* eslint-env browser */
import { createElement, createText } from '../../core/utils/dom.js';
import { matchAll } from '../../core/utils/pattern.js';
import usage from './text-match.usage.js';

const matchWrapperEl = createElement('span', 'view-text-match');

export default function(host) {
    host.view.define('text-match', function(el, config, data) {
        const { text, match: pattern, ignoreCase = false } = data || {};

        matchAll(
            String(text),
            pattern,
            text => el
                .appendChild(createText(text)),
            text => el
                .appendChild(matchWrapperEl.cloneNode())
                .appendChild(createText(text)),
            ignoreCase
        );
    }, {
        tag: false,
        usage
    });
}
