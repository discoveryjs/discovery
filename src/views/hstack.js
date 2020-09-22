/* eslint-env browser */
import usage from './hstack.usage.js';

export default function(discovery) {
    discovery.view.define('hstack', function(el, config, data, context) {
        const { content } = config;

        discovery.view.render(el, content, data, context);
    }, { usage });
}
