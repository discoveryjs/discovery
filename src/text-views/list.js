export default function({ textView }) {
    textView.define('list', createRenderList('\n\n', '\n', '', '\n'));
    textView.define('inline-list', createRenderList());
    textView.define('comma-list', createRenderList('', '', '', ', '));
    textView.define('ol', createRenderList('\n\n', '\n', '- ', '\n'));
    textView.define('ul', createRenderList('\n\n', '\n', '* ', '\n'));

    textView.define('list-item', function(node, config, data, context) {
        const { content = 'text' } = config;

        return textView.render(node, content, data, context);
    });

    function createRenderList(beforeList, afterList, beforeItem, afterItem, beforeMore, afterMore) {
        return async function renderList(node, config, data, context) {
            const { item, itemConfig, limit, emptyText } = config;
            let render;

            if (!Array.isArray(data) && data) {
                data = [data];
            }

            if (beforeList) {
                node.appendText(beforeList);
            }

            if (Array.isArray(data) && data.length > 0) {
                render = textView.renderList(node, this.composeConfig({
                    view: 'list-item',
                    content: item
                }, itemConfig), data, context, {
                    limit: textView.listLimit(limit, 25),
                    beforeMore,
                    afterMore,
                    beforeItem,
                    afterItem
                });
            } else {
                node.appendText(String(emptyText || '<empty list>'));
            }

            if (afterList) {
                node.appendText(afterList);
            }

            return render;
        };
    }
};
