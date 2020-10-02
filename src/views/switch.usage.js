export default {
    demo: {
        view: 'switch',
        data: { enabled: true },
        content: [
            {
                when: 'not enabled',
                content: 'text:"I am disabled"'
            },
            {
                when: 'enabled',
                content: 'text:"I am enabled"'
            }
        ]
    },
    examples: [
        {
            title: 'Using with tabs',
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
                        { when: '#.section="foo"', content: 'text:"FOO!"' },
                        { when: '#.section="bar"', content: 'text:"BAR!!"' },
                        { content: 'text:"When no other conditions are met"'}
                    ]
                }
            }
        }
    ]
};
