/* eslint-env browser */

export default function(discovery) {
    function renderTreeLines(container, renderElStack, leafBaseConfig, data, context, offset, limit) {
        if (limit === false) {
            limit = data.length;
        }

        data
            .slice(offset, offset + limit)
            .reduce(
                (pipeline, entry) => pipeline.then(() => {
                    const targetContainer = renderElStack[0];

                    return discovery.view
                        .render(targetContainer, {
                            ...leafBaseConfig,
                            expanded: entry.expanded,
                            last: entry.last,
                            hasChildren: entry.hasChildren,
                            children: entry.children
                        }, entry.data, context)
                        .then(() => {
                            if (entry.expanded && entry.hasChildren) {
                                const container = targetContainer.lastChild.querySelector('.view-tree-leaf-children');

                                container.classList.add('incomplete');
                                renderElStack.unshift(container);
                            } else {
                                while (entry.shift--) {
                                    renderElStack.shift().classList.remove('incomplete');
                                }
                            }
                        });
                }),
                Promise.resolve()
            )
            .then(() =>
                discovery.view.maybeMoreButtons(
                    container,
                    null,
                    data.length,
                    offset + limit,
                    limit,
                    (offset, limit) => renderTreeLines(container, renderElStack, leafBaseConfig, data, context, offset, limit)
                )
            );
    }

    function buildTreeLines(data, context, childrenGetter, expanded) {
        function processChildren(array, expanded, popCount = 0) {
            array.forEach((data, index, array) => {
                const children = discovery.query(childrenGetter, data, context);
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
                    children: leafExpanded ? null : childrenGetter,
                    shift: last && (!leafExpanded || !hasChildren) ? popCount + 1 : 0
                });

                if (hasChildren && leafExpanded) {
                    processChildren(
                        children,
                        typeof expanded === 'number' ? expanded - 1 : expanded,
                        last ? popCount + 1 : 0
                    );
                }
            });
        }

        const leafs = [];
        const visited = new Set();

        processChildren(data, expanded);

        return leafs;
    }

    discovery.view.define('tree', function render(el, config, data, context) {
        const { children, item = 'text', itemConfig, collapsible, emptyText, onToggle } = config;
        let { expanded, limit, limitLines = true } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty tree');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            limit = discovery.view.listLimit(limit, 25);
            limitLines = discovery.view.listLimit(limitLines, 25);
            expanded = typeof expanded === 'function' ? expanded : discovery.view.listLimit(expanded, 1);

            if (limitLines) {
                const lines = buildTreeLines(data, context, children, expanded);
                const leafBaseConfig = this.composeConfig({
                    view: 'tree-leaf',
                    itemConfig,
                    content: item,
                    collapsible,
                    onToggle
                }, itemConfig);

                renderTreeLines(el, [el], leafBaseConfig, lines, context, 0, limitLines);
            } else {
                this.renderList(el, this.composeConfig({
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
        }
    }, {
        tag: 'ul'
    });
}
