export default function({ textView }) {
    textView.define('text', {
        props: "{ text: #.props has no 'text'? } | overrideProps()",
        async render(node, config) {
            const { text } = config;
            node.appendText(String(text));
        }
    });
};
