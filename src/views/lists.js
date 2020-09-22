/* eslint-env browser */
import usage from './lists.usage.js';

export default function(discovery) {
    function render(el, config, data, context) {
        const { item = 'text', itemConfig, limit, emptyText } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty list');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            discovery.view.renderList(el, this.composeConfig({
                view: 'list-item',
                content: item
            }, itemConfig), data, context, 0, discovery.view.listLimit(limit, 25));
        }
    }

    discovery.view.define('list', render, { usage });
    discovery.view.define('inline-list', render, { usage });
    discovery.view.define('comma-list', render, { usage });
    discovery.view.define('ol', render, { tag: 'ol', usage });
    discovery.view.define('ul', render, { tag: 'ul', usage });
}
