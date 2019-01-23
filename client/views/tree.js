/* eslint-env browser */

export default function(discovery) {
    function renderChunk(container, renderElStack, itemConfig, data, context, offset, limit) {
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
                            view: 'tree-leaf',
                            content: itemConfig,
                            last: entry.last,
                            hasChildren: entry.hasChildren
                        }, entry.data, context)
                        .then(() => {
                            if (entry.hasChildren) {
                                renderElStack.unshift(targetContainer.lastChild.querySelector('.view-tree-leaf-children'));
                            } else {
                                while (entry.pop--) {
                                    renderElStack.shift();
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
                    (offset, limit) => renderChunk(container, renderElStack, itemConfig, data, context, offset, limit)
                )
            );
    }

    function buildTree(array, childrenGetter, context) {
        function processChildren(array, popCount = 0) {
            array.forEach((data, index, array) => {
                const children = discovery.query(childrenGetter, data, context);
                const hasChildren = Array.isArray(children) && children.length;
                const last = index === array.length - 1;

                leafs.push({
                    data,
                    last,
                    hasChildren,
                    pop: last && !hasChildren ? popCount + 1 : 0
                });

                if (hasChildren) {
                    processChildren(children, last ? popCount + 1 : 0);
                }
            });
        }

        const leafs = [];

        processChildren(array);

        return leafs;
    }

    discovery.view.define('tree', function render(el, config, data, context) {
        const { children, item = 'text', limit, emptyText } = config;

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty tree');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            renderChunk(
                el,
                [el],
                item,
                buildTree(data, children, context),
                context,
                0,
                discovery.view.listLimit(limit, 25)
            );
        }
    }, {
        tag: 'ul'
    });
}
