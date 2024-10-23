export default (view, group) => ({
    demo: {
        view,
        text: 'hello world'
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}:"${name}"`)
        },
        {
            title: 'Displaying content',
            beforeDemo: {
                view: 'md',
                source: [
                    'There are several ways to specify the main content of a badge:',
                    '- `content` option – allows to specify any renderable content and has the highest precedence',
                    '- `text` option – used when `content` is omitted or falsy; it renders as plain text',
                    '- When both `content` and `text` options are omitted, the `data` is used for content:',
                    '  - If `data` is a string, a number, or a boolean value, it is used as the `text` value',
                    '  - If `data` is an object, the value of `text` property of `data` coerced to a string is used',
                    '  - Otherwise, render an undefined'
                ].join('\n')
            },
            demo: [
                { view, data: '"data"', text: 'text', content: 'text:"RENDER"' },
                { view, data: '"data"', text: 'RENDER', content: '=undefined' },
                { view, data: '"data"', content: '=undefined' },
                { view, data: '"data"', text: 'RENDER' },
                { view, data: '"data"', text: '=undefined' },
                { view, data: '"RENDER"' },
                { view, data: '{ text: "RENDER" }' },
                { view, data: '{}' },
                { view, data: [1, 2, 3] }
            ]
        },
        {
            title: 'Using data as source of options',
            beforeDemo: {
                view: 'md',
                source: [
                    'The following properties are taken from the data when the appropriate options are not specified for a legacy reasons (is subject to remove in the future):',
                    '- `color`',
                    '- `textColor`',
                    '- `darkColor`',
                    '- `darkTextColor`',
                    '- `text`',
                    '- `href`',
                    '- `external`',
                    '- `prefix`',
                    '- `postfix`'
                ].join('\n')
            },
            highlightProps: ['data'],
            demo: {
                view,
                data: {
                    text: 'demo',
                    href: '#example'
                }
            }
        },
        {
            title: 'Custom colors',
            beforeDemo: {
                view: 'md',
                source: [
                    'Data properties to setup a custom colors:',
                    '* `color` – default background color',
                    '* `textColor` – default text color',
                    '* `darkColor` – background color in dark mode',
                    '* `darkTextColor` – text color in dark mode'
                ].join('\n')
            },
            demo: {
                view,
                text: 'Colored badge',
                color: 'rgba(237, 177, 9, 0.35)',
                textColor: 'orange',
                darkColor: '#ffff00',
                darkTextColor: 'black'
            }
        },
        {
            title: 'As a link',
            highlightProps: ['href', 'external'],
            demo: {
                view,
                text: 'Link to something',
                href: '#',
                external: true
            }
        },
        {
            title: 'Using onClick handler',
            highlightProps: ['onClick'],
            demo: {
                view,
                text: 'Show "Hello world"',
                onClick: Function('return () => alert("Hello world!")')()
            }
        },
        {
            title: 'Prefix and postfix',
            highlightProps: ['prefix', 'postfix'],
            demo: {
                view,
                prefix: 'prefix',
                text: 'link',
                postfix: 'postfix'
            }
        },
        {
            title: 'Complex content',
            highlightProps: ['content'],
            demo: {
                view,
                content: ['text:"text "', 'link{ href: "#example" }']
            }
        }
    ]
});
