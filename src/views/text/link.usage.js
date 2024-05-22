export default {
    demo: {
        view: 'link',
        text: 'I am link',
        href: '#example'
    },
    examples: [
        {
            title: 'Link opened in new tab',
            highlightProps: ['external'],
            demo: {
                view: 'link',
                text: 'Discovery github',
                href: 'https://github.com/discoveryjs/discovery',
                external: true
            }
        },
        {
            title: 'Infering text ⇿ href',
            highlightProps: ['text', 'href', 'data'],
            beforeDemo: 'md:"When `text` is omitted but `href` is specified, or vice versa, the opposite component is inferred from the specified one"',
            demo: [
                { view: 'link', text: 'http://example1.com' },
                { view: 'link', href: 'http://example2.com' },
                { view: 'link', data: '"http://example3.com"' }
            ]
        },
        {
            title: 'Using onClick handler',
            highlightProps: ['onClick'],
            demo: {
                view: 'link',
                text: 'Show "Hello world"',
                onClick: Function('return () => alert("Hello world!")')()
            }
        },
        {
            title: 'Using data as source of options',
            beforeDemo: {
                view: 'md',
                source: [
                    'The following properties are taken from the data when the appropriate options are not specified for a legacy reasons (is subject to remove in the future):',
                    '- `text`',
                    '- `href`',
                    '- `external`'
                ].join('\n')
            },
            highlightProps: ['data'],
            demo: {
                view: 'link',
                data: {
                    text: 'demo',
                    href: '#example'
                }
            }
        },
        {
            title: 'Complex content',
            highlightProps: ['content'],
            demo: {
                view: 'link',
                href: '#example',
                content: ['text:"text "', 'html:"<b>bold</b>"']
            }
        }
    ]
};
