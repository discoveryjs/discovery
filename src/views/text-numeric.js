import usage from './text-numeric.usage.js';

export default function(host) {
    host.view.define('text-numeric', function (el, config, data) {
        const value = String(data);

        el.innerHTML = value.replace(
            /\.\d+(eE[-+]?\d+)?|\B(?=(\d{3})+(\D|$))/g,
            m => m || '<span class="num-delim"></span>'
        );
    }, {
        tag: 'span',
        usage
    });
}
