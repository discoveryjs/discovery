export default (view, group) => ({
    demo: {
        view,
        data: ['one', 'two', 'three', 'four']
    },
    examples: [
        {
            title: 'Variations',
            demo: {
                view: 'context',
                data: ['foo', 'bar', 'baz'],
                content: group.map(view => [
                    'header:' + JSON.stringify('# ' + view),
                    view
                ])
            }
        },
        {
            title: 'Configure item\'s content',
            demo: [
                {
                    view,
                    data: ['one', 'two', 'three', 'four'],
                    item: [
                        'text:"<item> "',
                        {
                            view: 'link',
                            data: '{ href: "#" + $ }'
                        }
                    ]
                }
            ]
        },
        {
            title: 'Configure item\'s config',
            demo: {
                view,
                data: ['one', 'two', 'three', 'four'],
                itemConfig: {
                    className: 'special'
                },
                item: {
                    view: 'text',
                    data: '"prefix-" + $'
                }
            }
        }
    ]
});
