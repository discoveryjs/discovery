import usage from './text.usage.js';

export default function({ textView }) {
    textView.define('text', {
        props: "{ text: #.props has no 'text'? } | overrideProps()",
        usage,
        render(node, props) {
            const { text } = props;
            node.appendText(String(text));
        }
    });
};
