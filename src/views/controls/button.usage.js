/* eslint-env browser */

export default (view, group) => ({
    demo: {
        view,
        text: 'Button',
        onClick: Function('return () => alert("Hello world!")')()
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}{ text: "${name}" }`)
        },
        {
            title: 'Disabled state',
            demo: group.map(name => ({
                view: name,
                disabled: true,
                text: name
            }))
        },
        {
            title: 'Complex content',
            demo: {
                view: 'button',
                content: [
                    'text:"Example "',
                    'pill-badge:123'
                ]
            }
        },
        {
            title: 'Button as a link',
            demo: {
                view: 'button',
                text: 'Click me',
                href: '#url',
                external: true
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
                view,
                data: {
                    text: 'demo',
                    href: '#example',
                    external: true
                }
            }
        }
    ]
});
