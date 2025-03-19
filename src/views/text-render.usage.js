export default {
    beforeDemo: [
        'md:"The `text-render` view renders data as text using the `Model#textView` API. For a full list of available text views, refer to the [`text`](#views-showcase&render=text) section."'
    ],
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
