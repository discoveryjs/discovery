/* eslint-env browser */
import usage from './block.usage.js';

export default function(host) {
    host.view.define('block', function(el, config, data, context) {
        const { content = [], onInit, onChange } = config;
        const blockContent = typeof onInit !== 'function' && typeof onChange !== 'function'
            ? content // left as is since nothing to mix in
            : this.composeConfig(content, {
                onInit,
                onChange
            });

        return host.view.render(el, blockContent, data, context);
    }, { usage });
}
