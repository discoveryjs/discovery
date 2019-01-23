/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';

const toggleProto = createElement('span', 'view-tree-leaf-toggle', '–');

export default function(discovery) {
    const clickHandler = ({ target: cursor }) => {
        while (cursor && cursor.classList) {
            if (cursor.classList.contains('view-tree-leaf-toggle')) {
                const leaf = cursor.parentNode;

                leaf.classList.toggle('collapsed');
                cursor.firstChild.nodeValue = leaf.classList.contains('collapsed') ? '+' : '–';

                break;
            }

            cursor = cursor.parentNode;
        }
    };

    // single event handler for all `struct` view instances
    document.addEventListener('click', clickHandler, false);

    discovery.view.define('tree-leaf', function(el, config, data, context) {
        const { content, last, hasChildren } = config;
        const contentEl = el.appendChild(document.createElement('span'));

        el.className = 'view-tree-leaf';
        el.insertBefore(toggleProto.cloneNode(true), el.firstChild);

        if (last) {
            el.classList.add('last');
        }

        contentEl.className = 'tree-leaf-content';
        discovery.view.render(contentEl, content, data, context);

        if (hasChildren) {
            const childrenEl = el.appendChild(document.createElement('ul'));

            el.classList.add('has-children');
            childrenEl.className = 'view-tree-leaf-children';
        }
    }, {
        tag: 'li'
    });
}
