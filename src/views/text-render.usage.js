export default {
    demo: {
        view: 'text-render',
        content: [
            'text:"hello!"',
            {
                view: 'ul',
                data: [1, 2, 3, 4],
                item: 'text:"item #" + $'
            },
            {
                view: 'table',
                data: [
                    { name: 'foo', size: 1000 },
                    { name: 'bar', size: 123 },
                    { name: 'baz', size: 34555 }
                ]
            }
        ]
    }
};
