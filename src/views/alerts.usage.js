export default (view, group) => ({
    data: '"Alert"',
    demo: {
        view
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}:"${name}"`)
        },
        {
            title: 'Complex content',
            demo: {
                view,
                content: [
                    'h3:"Some header"',
                    'text:"Hello world!"'
                ]
            }
        }
    ]
});
