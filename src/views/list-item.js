/* eslint-env browser */
import usage from './list-item.usage.js';

export default function(discovery) {
    discovery.view.define('list-item', function(el, config, data, context) {
        const { content = 'text' } = config;

        return discovery.view.render(el, content, data, context);
    }, {
        tag: 'li',
        usage
    });
}
