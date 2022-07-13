export default (view, group) => ({
    demo: {
        view,
        data: JSON.stringify(view)
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}:"${name}"`)
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
                    '* `textColor` – text color in dark mode'
                ].join('\n')
            },
            demo: {
                view,
                data: {
                    text: 'Colored badge',
                    color: 'rgba(237, 177, 9, 0.35)',
                    textColor: 'orange',
                    darkColor: '#ffff00',
                    darkTextColor: 'black'
                }
            }
        },
        {
            title: 'As a link',
            demo: {
                view,
                data: {
                    text: 'Link to something',
                    href: '#',
                    external: true
                }
            }
        },
        {
            title: 'Prefix and postfix',
            demo: {
                view,
                data: {
                    prefix: 'prefix',
                    text: 'link',
                    postfix: 'postfix'
                }
            }
        },
        {
            title: 'With a hint',
            demo: {
                view,
                data: {
                    text: 'text',
                    hint: 'hint'
                }
            }
        }
    ]
});
