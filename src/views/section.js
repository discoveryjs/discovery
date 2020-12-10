/* eslint-env browser */
import usage from './section.usage.js';

export default function(discovery) {
    discovery.view.define('section', function(el, config, data, context) {
        const { header, content } = config;

        return discovery.view.render(el, [
            { view: 'header', content: header },
            content
        ], data, context);
    }, { usage });
}
