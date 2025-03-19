export default {
    demo: {
        view: 'link',
        text: 'I am a link',
        href: '#example'
    },
    examples: [
        {
            title: 'Infering text ⇿ href',
            highlightProps: ['text', 'href', 'data'],
            beforeDemo: ['md:"When `text` is omitted but `href` is specified, or vice versa, the opposite component is inferred from the specified one"'],
            demo: [
                { view: 'link', text: 'http://example1.com' },
                { view: 'link', href: 'http://example2.com' },
                { view: 'link', data: '"http://example3.com"' }
            ]
        }
    ]
};
