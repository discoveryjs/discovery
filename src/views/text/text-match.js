/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import { matchAll } from '../../core/utils/pattern.js';
import usage from './text-match.usage.js';

const matchWrapperEl = createElement('span', 'view-text-match');
const props = `is not array? | {
    text: #.props has no 'text' ? text,
    match,
    ignoreCase: ignoreCase or false
} | overrideProps()`;

export default function(host) {
    host.view.define('text-match', function(el, props) {
        const {
            text,
            match: pattern,
            ignoreCase
        } = props;

        matchAll(
            String(text),
            pattern,
            text => el
                .append(text),
            text => el
                .appendChild(matchWrapperEl.cloneNode())
                .append(text),
            ignoreCase
        );
    }, {
        tag: false,
        props,
        usage
    });
}
