/* eslint-env browser */
import usage from './menu.usage.js';

export default function(discovery) {
    discovery.view.define('menu', function(el, config, data, context) {
        const { name = 'filter', item, itemConfig, limit, emptyText, onClick, onInit, onChange } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'No items');
        }

        if (Array.isArray(data)) {
            const composedItemConfig = this.composeConfig({
                view: 'menu-item',
                content: item,
                onClick: typeof onClick === 'function'
                    ? onClick
                    : typeof onChange === 'function'
                        ? (data) => onChange(data, name)
                        : undefined
            }, itemConfig);

            return discovery.view.renderList(
                el,
                composedItemConfig,
                data,
                context,
                0,
                discovery.view.listLimit(limit, 25)
            ).then(() => {
                if (typeof onInit === 'function') {
                    onInit(discovery.query('.[selected].pick()', data, context), name);
                }
            });
        }
    }, { usage });
}
