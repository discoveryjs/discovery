/* eslint-env browser */
import usage from './section.usage.js';

export default function(host) {
    host.view.define('section', function(el, config, data, context) {
        const { header, content } = config;

        return host.view.render(el, [
            { view: 'header', content: header },
            content
        ], data, context);
    }, { usage });
}
