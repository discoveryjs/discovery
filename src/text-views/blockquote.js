import usage from './blockquote.usage.js';

export default function({ textView }) {
    textView.define('blockquote', function(node, props, data, context) {
        const { content = 'text', kind } = props;

        if (typeof kind === 'string') {
            node.appendLine().appendText(`[!${kind.toUpperCase()}]`);
        }

        return textView.render(node, content, data, context);
    }, {
        type: 'block',
        usage,
        border: {
            left: '> '
        }
    });
};
