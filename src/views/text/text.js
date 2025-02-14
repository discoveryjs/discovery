/* eslint-env browser */
import usage from './text.usage.js';

const props = `{
    text: #.props has no 'text'?
} | overrideProps()`;

export default function(host) {
    host.view.define('text', function(el, { text }) {
        el.appendChild(document.createTextNode(String(text)));
    }, {
        tag: false,
        props,
        usage
    });
}
