/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';

export default function(discovery) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        const toggleEl = target.closest('.view-tree-leaf-toggle');

        if (toggleEl) {
            const state = elementToData.get(toggleEl);
            const expanded = !toggleEl.parentNode.classList.toggle('collapsed');

            if (typeof state.render === 'function') {
                state.render();
            }

            if (typeof state.onToggle === 'function') {
                state.onToggle(expanded, toggleEl.parentNode, state.data, state.context);
            }
        }
    };

    // single event handler for all `tree-leaf` view instances
    discovery.addGlobalEventListener('click', clickHandler, false);

    discovery.view.define('tree-leaf', function(el, config, data, context) {
        const { expanded, content = 'text', itemConfig, collapsible = true, last, hasChildren, children, limit, onToggle } = config;
        const toggleEl = el.appendChild(createElement('span', 'view-tree-leaf-toggle'));
        const contentEl = el.appendChild(createElement('span', 'view-tree-leaf-content'));
        let childrenData = null;
        let hasChildrenEl = hasChildren;

        if (last) {
            el.classList.add('last');
        }

        if (!collapsible) {
            el.classList.add('non-collapsible');
        }

        this.render(contentEl, content, data, context);

        if (children) {
            childrenData = discovery.query(children, data, context);
            hasChildrenEl = Array.isArray(childrenData) && childrenData.length > 0;
        }

        if (hasChildrenEl) {
            const childrenEl = el.appendChild(createElement('ul', 'view-tree-leaf-children'));
            const state = { data, context, onToggle, render: null };
            const renderChildren = (data, expanded) => {
                if (typeof expanded === 'number') {
                    expanded--;
                }

                this.renderList(childrenEl, this.composeConfig({
                    view: 'tree-leaf',
                    expanded,
                    itemConfig,
                    content,
                    collapsible,
                    children,
                    limit,
                    onToggle
                }, itemConfig), data, context, 0, this.listLimit(limit, 25));
            };

            el.classList.add('has-children');
            elementToData.set(toggleEl, state);

            if (typeof expanded === 'function' ? expanded(data, context) : expanded) {
                if (childrenData) {
                    renderChildren(childrenData, expanded);
                }
            } else {
                el.classList.add('collapsed');

                if (childrenData) {
                    state.render = () => {
                        state.render = null;
                        renderChildren(childrenData, expanded || 1);
                    };
                }
            }
        }
    }, {
        tag: 'li'
    });
}
