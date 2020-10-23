export default {
    demo: {
        view: 'context',
        data: { name: 'text', demo: 123  },
        content: [
            'text:name',
            'table'
        ]
    },
    examples: [
        {
            title: 'Using with modifiers',
            demo: {
                view: 'context',
                modifiers: [
                    'h2:"Modifiers"',
                    {
                        view: 'input',
                        name: 'inputValue'
                    },
                    {
                        view: 'select',
                        name: 'selectValue',
                        data: ['foo', 'bar', 'baz']
                    }
                ],
                content: [
                    'h2:"Values"',
                    'struct:#'
                ]
            }
        }
    ]
};
