/* eslint-env browser */
import usage from './lists.usage.js';

export default function(host) {
    function render(el, config, data, context) {
        const { item, itemConfig, limit, emptyText } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty list');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            return host.view.renderList(el, this.composeConfig({
                view: 'list-item',
                content: item
            }, itemConfig), data, context, 0, host.view.listLimit(limit, 25));
        }
    }

    host.view.define('list', render, { usage });
    host.view.define('inline-list', render, { usage });
    host.view.define('comma-list', render, { usage });
    host.view.define('ol', render, { tag: 'ol', usage });
    host.view.define('ul', render, { tag: 'ul', usage });
}
