/* eslint-env browser */
import usage from './tree.usage.js';

export default function(host) {
    function renderTreeLines(container, renderStack, data, context, offset, limit) {
        if (limit === false) {
            limit = data.length;
        }

        container.classList.add('incomplete');
        return data
            .slice(offset, offset + limit)
            .reduce(
                (pipeline, entry) => pipeline.then(() => {
                    const {
                        container: targetContainer,
                        itemConfig
                    } = renderStack;

                    return host.view
                        .render(targetContainer, host.view.composeConfig(itemConfig, {
                            expanded: entry.expanded,
                            last: entry.last,
                            hasChildren: entry.hasChildren,
                            children: entry.children
                        }), entry.data, context)
                        .then(() => {
                            if (entry.expanded && entry.hasChildren) {
                                const container = targetContainer.lastChild.querySelector('.view-tree-leaf-children');

                                container.classList.add('incomplete');
                                renderStack = {
                                    container,
                                    itemConfig: host.view.composeConfig(itemConfig, itemConfig.itemConfig),
                                    prev: renderStack
                                };
                            } else {
                                while (entry.shift--) {
                                    renderStack.container.classList.remove('incomplete');
                                    renderStack = renderStack.prev;
                                }
                            }
                        });
                }),
                Promise.resolve()
            )
            .then(() => host.view.maybeMoreButtons(
                container,
                null,
                data.length,
                offset + limit,
                limit,
                (offset, limit) => renderTreeLines(container, renderStack, data, context, offset, limit)
            ) || container.classList.remove('incomplete'));
    }

    function buildTreeLines(data, context, itemConfig, expanded) {
        function processChildren(array, expanded, itemConfig, popCount = 0) {
            array.forEach((data, index, array) => {
                const children = host.query(itemConfig.children, data, context);
                const hasChildren = Array.isArray(children) && children.length > 0;
                const last = index === array.length - 1;
                const leafExpanded =
                    visited.has(data)
                        ? 0
                        : typeof expanded === 'function'
                            ? expanded(data, context)
                            : expanded;

                visited.add(data);
                leafs.push({
                    data,
                    expanded: leafExpanded,
                    last,
                    hasChildren,
                    children: leafExpanded ? null : itemConfig.children,
                    shift: last && (!leafExpanded || !hasChildren) ? popCount + 1 : 0
                });

                if (hasChildren && leafExpanded) {
                    processChildren(
                        children,
                        typeof expanded === 'number' ? expanded - 1 : expanded,
                        host.view.composeConfig(itemConfig, itemConfig.itemConfig),
                        last ? popCount + 1 : 0
                    );
                }
            });
        }

        const leafs = [];
        const visited = new Set();

        processChildren(data, expanded, itemConfig);

        return leafs;
    }

    host.view.define('tree', function render(el, config, data, context) {
        const { children = 'children', item = 'text', itemConfig, collapsible, emptyText, onToggle } = config;
        let { expanded, limit, limitLines = true } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty tree');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            limit = host.view.listLimit(limit, 25);
            limitLines = host.view.listLimit(limitLines, 25);
            expanded = typeof expanded === 'function' ? expanded : host.view.listLimit(expanded, 1);

            if (limitLines) {
                const lines = buildTreeLines(data, context, this.composeConfig({ children }, itemConfig), expanded);
                const renderStack = {
                    container: el,
                    itemConfig: this.composeConfig({
                        view: 'tree-leaf',
                        itemConfig,
                        content: item,
                        collapsible,
                        onToggle
                    }, itemConfig)
                };

                return renderTreeLines(el, renderStack, lines, context, 0, limitLines);
            }

            return this.renderList(el, this.composeConfig({
                view: 'tree-leaf',
                itemConfig,
                content: item,
                collapsible,
                expanded,
                children,
                limit,
                onToggle
            }, itemConfig), data, context, 0, limit);
        }
    }, {
        tag: 'ul',
        usage
    });
}
