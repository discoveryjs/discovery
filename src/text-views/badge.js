import usage from './badges.usage.js';

export default function({ textView }) {
    const commonConfig = {
        type: 'inline-block',
        usage,
        props: `is not array? | {
            text: #.props has no 'content' ? is (string or number or boolean) ?: text,
            content: undefined,
            prefix,
            postfix
        } | overrideProps()`,
        render(node, props, data, context) {
            const { text, content, prefix, postfix } = props;
            let render;

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

            return render;
        }
    };

    textView.define('badge', {
        ...commonConfig,
        border: {
            left: ['⎡', '⎢', '⎣', '['],
            right: ['⎤', '⎥', '⎦', ']']
            // left: ['╭ ', '│', '╰', '['],
            // right: [' ╮', '│', '╯', ']']
        }
    });
    textView.define('pill-badge', {
        ...commonConfig,
        border: {
            left: ['⎧', '⎪', '⎩', '('],
            right: ['⎫', '⎪', '⎭', ')']
        }
    });
};
