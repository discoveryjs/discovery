import usage from './base-blocks.usage.js';

export default function({ textView }) {
    function render(node, props, data, context) {
        const { content = 'text', border } = props;

        if (border) {
            node.setBorder(border);
        }

        return textView.render(node, content, data, context);
    }

    textView.define('inline', { type: 'inline', usage, render });
    textView.define('inline-block', { type: 'inline-block', usage, render });
    textView.define('block', { type: 'block', usage, render });
    textView.define('line', { type: 'line', usage, render });
};
