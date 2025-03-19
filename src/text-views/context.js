import usage from './context.usage.js';

export default function({ textView }) {
    textView.define('context', function(node, props, data, context) {
        const { content = [] } = props;

        return textView.render(node, content, data, context);
    }, { usage });
}
