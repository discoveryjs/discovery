export default {
    demo: {
        view: 'content-filter',
        data: ['foo', 'bar', 'baz'],
        content: {
            view: 'list',
            data: '.[$ ~= #.filter]'
        }
    },
    examples: [
        {
            title: 'Using with text-match',
            demo: {
                view: 'content-filter',
                data: [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }],
                name: 'customName',
                content: {
                    view: 'list',
                    data: '.[name ~= #.customName]',
                    item: 'text-match:{ text: name, match: #.customName }'
                }
            }
        }
    ]
};
