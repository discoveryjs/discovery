import usage from './lists.usage.js';

export default function({ textView }) {
    textView.define('list', createRenderList('line', ''), { type: 'block', usage });
    textView.define('inline-list', createRenderList('inline-block'), { type: 'inline-block', usage });
    textView.define('comma-list', createRenderList('inline-block', '', ','), { type: 'inline-block', usage });
    textView.define('ol', createRenderList('line', (ctx) => (1 + ctx.index) + '. '), { type: 'block', usage });
    textView.define('ul', createRenderList('line', '- '), { type: 'block', usage });

    textView.define('list-item', function(node, props, data, context) {
        const { content = 'text', bullet, delim, renderType = 'line' } = props;
        const bulletFn = typeof bullet === 'function'
            ? bullet
            : bullet ? (() => bullet) : null;
        const delimFn = typeof delim === 'function'
            ? delim
            : delim ? (() => delim) : null;

        node.type = renderType;

        if (bulletFn || delimFn) {
            node.setBorder({
                left: bulletFn ? (idx => idx === 0 ? bulletFn(context) : '') : null,
                right: delimFn ? (idx => idx === 0 && context.index !== context.array.length - 1 ? delimFn(context) : '') : null
            });
        }

        return textView.render(node, content, data, context);
    });

    function createRenderList(renderType, bullet, delim) {
        return async function renderList(node, config, data, context) {
            const { item, itemConfig, limit, emptyText } = config;
            let render;

            if (!Array.isArray(data) && data) {
                data = [data];
            }

            if (Array.isArray(data) && data.length > 0) {
                render = textView.renderList(node, this.composeConfig({
                    view: 'list-item',
                    content: item,
                    bullet,
                    delim,
                    renderType
                }, itemConfig), data, context, {
                    limit: textView.listLimit(limit, 25)
                });
            } else {
                node.appendText(String(emptyText || '<empty list>'));
            }

            return render;
        };
    }
};
