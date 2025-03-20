export default function({ textView }) {
    function render(node, props, data, context) {
        const { content = 'text', border } = props;

        if (border) {
            node.setBorder(border);
        }

        return textView.render(node, content, data, context);
    }

    textView.define('inline', { type: 'inline', render });
    textView.define('inline-block', { type: 'inline-block', render });
    textView.define('block', { type: 'block', render });
    textView.define('line', { type: 'line', render });
};
