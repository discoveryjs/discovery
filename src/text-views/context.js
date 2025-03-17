export default function({ textView }) {
    textView.define('context', function(node, config, data, context) {
        const { content = [] } = config;

        return textView.render(node, content, data, context);
    });
}
