import { numDelim } from '../../core/utils/html.js';
import usage from './text-numeric.usage.js';

const props = `{
    text: #.props has no 'text'?
} | overrideProps()`;

export default function(host) {
    host.view.define('text-numeric', function (el, { text }) {
        el.innerHTML = numDelim(text);
    }, {
        tag: 'span',
        props,
        usage
    });
}
