/* eslint-env browser */

import { createElement } from '../../core/utils/dom.js';

const props = `#.props | {
    $items: children.query(@, #.context) | is array?;

    itemConfig,
    content is not undefined ?: 'text',
    collapsible is not undefined ?: true,
    onToggle,
    expanded,
    last,
    hasChildren: hasChildren or $items.size() > 0,
    children,
    $items,
    limit: limit | $ = false or is int ?: 25
}`;

export default function(host) {
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
    host.addHostElEventListener('click', clickHandler, false);

    host.view.define('tree-leaf', async function(el, props, data, context) {
        const {
            expanded,
            hasChildren,
            children,
            items,
            content,
            itemConfig,
            collapsible,
            last,
            limit,
            onToggle
        } = props;
        const toggleEl = el.appendChild(createElement('span', 'view-tree-leaf-toggle'));
        const contentEl = el.appendChild(createElement('span', 'view-tree-leaf-content'));

        if (last) {
            el.classList.add('last');
        }

        if (!collapsible) {
            el.classList.add('non-collapsible');
        }

        await this.render(contentEl, content, data, context);

        if (hasChildren) {
            const childrenEl = el.appendChild(createElement('ul', 'view-tree-leaf-children'));
            const state = { data, context, onToggle, render: null };
            const renderChildren = (data, expanded) => {
                if (typeof expanded === 'number') {
                    expanded--;
                }

                return this.renderList(childrenEl, this.composeConfig({
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
                if (items) {
                    await renderChildren(items, expanded);
                }
            } else {
                el.classList.add('collapsed');

                if (items) {
                    state.render = () => {
                        state.render = null;
                        renderChildren(items, expanded || 1);
                    };
                }
            }
        }
    }, {
        tag: 'li',
        props
    });
}
