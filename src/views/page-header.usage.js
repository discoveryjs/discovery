export default (view) => ({
    demo: `${view}:"Page header \\"${view}\\""`,
    examples: [
        {
            title: 'Prelude',
            demo: {
                view,
                prelude: 'badge:{ text: "demo" }',
                content: 'h1:"Header"'
            }
        }
    ]
});
