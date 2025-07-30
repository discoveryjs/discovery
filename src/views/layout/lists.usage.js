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
                    `header{ content: 'md:${JSON.stringify('`view: \\"' + view + '\\"`')}' }`,
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
        },
        {
            title: 'Configure item\'s limit',
            demo: {
                view,
                data: ['one', 'two', 'three', 'four'],
                limit: 2,
                item: 'text:$'
            }
        },
        {
            title: 'Configure item\'s no limit',
            demo: {
                view,
                data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
                limit: false,
                item: 'text:$'
            }
        }
    ]
});
