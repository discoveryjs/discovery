/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';

const toggleProto = createElement('span', 'view-tree-leaf-toggle');


export default function(discovery) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        const toggleEl = target.closest('.view-tree-leaf-toggle');

        if (toggleEl) {
            const fn = elementToData.get(toggleEl);

            if (typeof fn === 'function') {
                fn();
            }

            toggleEl.parentNode.classList.toggle('collapsed');
        }
    };

    // single event handler for all `tree-leaf` view instances
    document.addEventListener('click', clickHandler, false);

    discovery.view.define('tree-leaf', function(el, config, data, context) {
        const { expanded, content, collapsible = true, last, hasChildren, children, limit } = config;
        const contentEl = el.appendChild(createElement('span', 'tree-leaf-content'));
        let childrenData = null;
        let hasChildrenEl = hasChildren;

        el.insertBefore(toggleProto.cloneNode(true), el.firstChild);

        if (last) {
            el.classList.add('last');
        }

        if (!collapsible) {
            el.classList.add('non-collapsible');
        }

        discovery.view.render(contentEl, content, data, context);

        if (children) {
            childrenData = discovery.query(children, data, context);
            hasChildrenEl = Array.isArray(childrenData) && childrenData.length > 0;
        }

        if (hasChildrenEl) {
            const childrenEl = el.appendChild(createElement('ul', 'view-tree-leaf-children'));
            const renderChildren = function(data, expanded) {
                discovery.view.renderList(childrenEl, {
                    view: 'tree-leaf',
                    expanded,
                    content,
                    children
                }, data, context, 0, discovery.view.listLimit(limit, 25));
            };

            el.classList.add('has-children');

            if (expanded) {
                if (childrenData) {
                    renderChildren(childrenData, expanded - 1);
                }
            } else {
                el.classList.add('collapsed');

                if (childrenData) {
                    elementToData.set(el.firstChild, () => {
                        elementToData.delete(el.firstChild);
                        renderChildren(childrenData, 0);
                    });
                }
            }
        }
    }, {
        tag: 'li'
    });
}
