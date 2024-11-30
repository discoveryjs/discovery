/* eslint-env browser */
import usage from './section.usage.js';

export default function(host) {
    host.view.define('section', function(el, config, data, context) {
        const { header, content = [], onInit, onChange } = config;
        const mixinHandlersIfNeeded = (config) =>
            typeof onInit !== 'function' && typeof onChange !== 'function'
                ? config // left as is since nothing to mix in
                : this.composeConfig(config, {
                    onInit,
                    onChange
                });

        return host.view.render(el, [
            { view: 'header', content: mixinHandlersIfNeeded(header) },
            mixinHandlersIfNeeded(content)
        ], data, context);
    }, { usage });
}
