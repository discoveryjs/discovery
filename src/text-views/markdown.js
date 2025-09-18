import usage from './markdown.usage.js';

const props = `is not array? | {
    source: #.props has no 'source' ? is (string or array) ?
} | overrideProps() | {
    ...,
    source is not array ?: join('\\n')
}`;

export default function(host) {
    function render(node, props) {
        const { source } = props;

        node.appendText(source);
    }

    host.textView.define('markdown', { type: 'block', props, usage, render });
    host.textView.define('md', { type: 'block', props, usage, render });
}
