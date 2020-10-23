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
            title: 'With color',
            demo: {
                view,
                data: {
                    color: 'rgba(237, 177, 9, 0.35)',
                    text: 'Colored badge'
                }
            }
        },
        {
            title: 'With text color',
            demo: {
                view,
                data: {
                    textColor: 'red',
                    text: 'Badge with colored text'
                }
            }
        },
        {
            title: 'With explicit dark-mode colors',
            demo: {
                view,
                data: {
                    color: 'blue',
                    textColor: 'white',
                    darkColor: 'yellow',
                    darkTextColor: 'black',
                    text: 'Badge with colored text'
                }
            }
        },
        {
            title: 'As a link',
            demo: {
                view,
                data: {
                    href: '#',
                    text: 'Click me!'
                }
            }
        },
        {
            title: 'Prefix and postfix',
            demo: {
                view,
                data: {
                    prefix: 'prefix',
                    postfix: 'postfix',
                    text: 'text'
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
