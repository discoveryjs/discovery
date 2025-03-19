export default (view, group) => ({
    demo: {
        view,
        data: ['one', 'two', 'three', 'four']
    },
    examples: [
        {
            title: 'Variations',
            demoData: ['foo', 'bar', 'baz'],
            demo: group.map(view => [
                `header:'view: \\"${view}\\"'`,
                view
            ]).flat()
        },
        {
            title: 'Variations long lists',
            demoData: Array.from({ length: 100 }, (_, idx) => 'item#' + idx),
            demo: group.map(view => [
                `header:'view: \\"${view}\\"'`,
                { view: view, limit: 3 }
            ]).flat()
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
        }
    ]
});
