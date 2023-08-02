import { numDelim } from '../../core/utils/html.js';
import usage from './text-numeric.usage.js';

export default function(host) {
    host.view.define('text-numeric', function (el, config, data) {
        el.innerHTML = numDelim(data);
    }, {
        tag: 'span',
        usage
    });
}
