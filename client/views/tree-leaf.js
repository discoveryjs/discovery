/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';

const toggleProto = createElement('span', 'view-tree-leaf-toggle', '–');

export default function(discovery) {
    const clickHandler = ({ target }) => {
        const toggleEl = target.closest('.view-tree-leaf-toggle');

        if (toggleEl) {
            const leafEl = toggleEl.parentNode;

            leafEl.classList.toggle('collapsed');
            toggleEl.firstChild.nodeValue = leafEl.classList.contains('collapsed') ? '+' : '–';
        }
    };

    // single event handler for all `tree-leaf` view instances
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
