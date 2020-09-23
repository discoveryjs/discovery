export default [
    {
        title: 'Variations',
        view: [
            'badge:{text:"Default badge"}',
            'pill-badge:{text:"Pill badge"}'
        ]
    },
    {
        title: 'Default usage',
        view: {
            view: 'badge',
            data: {
                text: 'Hello world!'
            }
        }
    },
    {
        title: 'With color',
        view: {
            view: 'badge',
            data: {
                color: '#F9E4A9',
                text: 'Colored badge'
            }
        }
    },
    {
        title: 'Badge as a link',
        view: {
            view: 'badge',
            data: {
                href: '#',
                text: 'Link badge'
            }
        }
    },
    {
        title: 'Badge with prefix and postfix',
        view: {
            view: 'badge',
            data: {
                prefix: 'I am prefix',
                postfix: 'I am postfix',
                text: 'badge'
            }
        }
    }
];
