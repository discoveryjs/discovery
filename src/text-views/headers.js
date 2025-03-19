import usage from './headers.usage.js';

export default function({ textView }) {
    function renderHeader(level) {
        const prefix = '#'.repeat(level) + ' ';

        return async function render(node, config, data, context) {
            const { content } = config;

            node.appendText(prefix);
            return textView.render(node, content || 'text', data, context);
        };
    }

    textView.define('header', renderHeader(1), { type: 'block', usage });
    textView.define('h1', renderHeader(1), { type: 'block', usage });
    textView.define('h2', renderHeader(2), { type: 'block', usage });
    textView.define('h3', renderHeader(3), { type: 'block', usage });
    textView.define('h4', renderHeader(4), { type: 'block', usage });
    textView.define('h5', renderHeader(5), { type: 'block', usage });
}
