/* eslint-env browser */
import usage from './hstack.usage.js';

export default function(host) {
    host.view.define('hstack', function(el, config, data, context) {
        const { content = [] } = config;

        return host.view.render(el, content, data, context);
    }, { usage });
}
