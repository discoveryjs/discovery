export default function({ textView }) {
    textView.define('text', async function(node, config) {
        const { text } = config;
        node.appendText(String(text));
    }, {
        props: "{ text: #.props has no 'text'? } | overrideProps()"
    });

    textView.define('badge', function(node, props, data, context) {
        const { text, content, prefix, postfix } = props;
        let render;

        node.appendText('[');

        if (prefix) {
            node.appendText(String(prefix) + ' ');
        }

        if (content) {
            render = this.render(node, content, data, context);
        } else {
            node.appendText(String(text));
        }

        if (postfix) {
            node.appendText(' ' + String(postfix));
        }

        node.appendText(']');

        return render;
    }, { props: `is not array? | {
        text: #.props has no 'content' ? is (string or number or boolean) ?: text,
        content: undefined,
        prefix,
        postfix
    } | overrideProps()`});
};
