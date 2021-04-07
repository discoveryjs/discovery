/* eslint-env browser */
import usage from './columns.usage.js';

export default function(host) {
    host.view.define('column', function(el, config, data, context) {
        const { content = [] } = config;

        return host.view.render(el, content, data, context);
    }, { usage });
}
