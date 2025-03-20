import usage from './alert.usage.js';

export default function({ textView }) {
    textView.define('alert', {
        type: 'block',
        usage,
        border: {
            top: ['╔', '═', '╗'],
            left: '║ ',
            right: ' ║',
            bottom: ['╚', '═', '╝']
        },
        render(node, props, data, context) {
            const { content = 'text' } = props;

            return textView.render(node, content, data, context);
        }
    });
};
