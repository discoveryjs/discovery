import usage from './blockquote.usage.js';

export default function({ textView }) {
    textView.define('blockquote', function(node, props, data, context) {
        const { content = 'text' } = props;

        return textView.render(node, content, data, context);
    }, {
        type: 'block',
        usage,
        border: {
            left: '> '
        }
    });
};
