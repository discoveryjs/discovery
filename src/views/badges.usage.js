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
                    color: '#F9E4A9',
                    text: 'Colored badge'
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
