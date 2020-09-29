/* eslint-env browser */
import usage from './columns.usage.js';

export default function(discovery) {
    discovery.view.define('column', function(el, config, data, context) {
        const { content = [] } = config;

        return discovery.view.render(el, content, data, context);
    }, { usage });
}
