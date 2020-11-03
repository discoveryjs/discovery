export default (view) => ({
    demo: `${view}:"That's a \\"${view}\\""`,
    examples: [
        {
            title: 'Prelude',
            demo: {
                view,
                prelude: [
                    'badge:{ text: "demo" }',
                    'badge:{ text: "demo", prefix: "prelude", postfix: "postfix" }'
                ],
                content: 'h1:"Header"'
            }
        }
    ]
});
