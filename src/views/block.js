/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('block', function(el, config, data, context) {
        const { content = [], onInit, onChange } = config;
        const blockContent = typeof onInit !== 'function' && typeof onChange !== 'function'
            ? content // left as is since nothing to mix in
            : this.composeConfig(content, {
                onInit,
                onChange
            });

        return discovery.view.render(el, blockContent, data, context);
    });
}
