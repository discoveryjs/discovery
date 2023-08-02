export default (view) => ({
    beforeDemo: [
        'md:"A special view to be used as the first view in the body of the page. This view stays in place as the page scrolls (although it may move slightly to the top of the page at the start of the scroll), so that the most relevant information and important action elements can remain accessible despite page scrolling."'
    ],
    demoFixed: 100,
    demo: `${view}:"That's a \\"${view}\\""`,
    examples: [
        {
            title: 'Prelude',
            demoFixed: 150,
            highlightProps: ['prelude'],
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
