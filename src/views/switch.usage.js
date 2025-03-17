export default {
    beforeDemo: [
        'md:"A non-visual view that conditionally renders a single matching section from the provided content. It sequentially evaluates each item\'s `when` expression and renders the content of the first truthy condition. If an item has no `when` property, its condition defaults to truthy, enabling unconditional rendering, often used as a fallback or default content."'
    ],
    demo: {
        view: 'switch',
        content: [
            {
                when: 'expr',
                content: 'text:"Renders when `expr` is truthy"'
            },
            {
                content: 'text:"Renders when all other `when` conditions are falsy"'
            }
        ]
    },
    examples: [
        {
            title: 'Using with context and a modifier',
            demo: {
                view: 'context',
                modifiers: {
                    view: 'tabs',
                    tabs: ['foo', 'bar', 'baz'],
                    name: 'section'
                },
                content: {
                    view: 'switch',
                    content: [
                        { when: '#.section="foo"', content: 'text:"Content for `foo`"' },
                        { when: '#.section="bar"', content: 'text:"Content for `bar`"' },
                        { content: 'text:"No content is found for `" + #.section + "`"' }
                    ]
                }
            }
        }
    ]
};
