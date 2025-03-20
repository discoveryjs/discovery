export default (view, group) => ({
    demo: {
        view,
        text: 'hello world'
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => [
                `${name}:"${name}"`,
                `${name}:"${name}\\nmulti-line"`,
                `${name}:"${name}\\nmulti-line\\nmore..."`
            ]).flat()
        },
        {
            title: 'Complex content',
            highlightProps: ['content'],
            demo: {
                view,
                content: ['text:"text"', 'link:"#example"', 'text:"text"']
            }
        }
    ]
});
