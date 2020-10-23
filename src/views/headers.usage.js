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
                    'link:{text:"Link"}'
                ]
            }
        }
    ]
});
