/* eslint-env browser */
import usage from './menu.usage.js';

export default function(host) {
    host.view.define('menu', function(el, config, data, context) {
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

            return host.view.renderList(
                el,
                composedItemConfig,
                data,
                context,
                0,
                host.view.listLimit(limit, 25)
            ).then(() => {
                if (typeof onInit === 'function') {
                    onInit(host.query('.[selected].pick()', data, context), name);
                }
            });
        }
    }, { usage });
}
