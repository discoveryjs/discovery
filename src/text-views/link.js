import usage from './link.usage.js';

const props = `is not array? | {
    text: #.props.content is undefined ? is string ?: text,
    content: undefined,
    href
} | overrideProps() | {
    $text; $href;
    ...,
    text: $text | is not undefined or no $href ?: $href,
    href: $href | is not undefined or no $text ?: $text
}`;

export default function({ textView }) {
    textView.define('link', async function(node, props, data, context) {
        let {
            text,
            content,
            href
        } = props;

        if (href) {
            node.appendText('[');
        }

        if (content) {
            await textView.render(node, content, data, context);
        } else {
            node.appendText(text);
        }

        if (href) {
            node.appendText(`](${href})`);
        }
    }, {
        type: 'inline-block',
        props,
        usage
    });
}
