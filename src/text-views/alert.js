export default function({ textView }) {
    textView.define('alert', function(node, props, data, context) {
        const { content = 'text' } = props;

        return textView.render(node, content, data, context);
    }, {
        type: 'block',
        border: {
            top: ['╔', '═', '╗'],
            left: '║ ',
            right: ' ║',
            bottom: ['╚', '═', '╝']
        }
    });
};
