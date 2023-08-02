export default (view, group) => ({
    demo: `${view}:"Header \\"${view}\\""`,
    examples: [
        {
            title: 'Variations',
            view: group.map(view => `${view}:"Header \\"${view}\\""`)
        },
        {
            title: 'Complex content',
            demo: {
                view,
                content: [
                    'text:"Text "',
                    'link:{ text: "Link" }'
                ]
            }
        },
        {
            title: 'Using anchor',
            demo: [
                {
                    view,
                    anchor: 'foo',
                    content: 'text:"Explicit value for an anchor"'
                },
                {
                    view,
                    anchor: true,
                    content: 'text:"Auto generated anchor based on text content of header"'
                }
            ]
        }
    ]
});
