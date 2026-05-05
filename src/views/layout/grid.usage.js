export default {
    demo: {
        view: 'grid',
        rows: [
            ['text:"Row 1"', 'text:"Row 1 value"'],
            ['text:"Row 2"', 'text:"Row 2 value"']
        ]
    },
    examples: [
        {
            title: 'Customize gap and column template',
            demo: {
                view: 'grid',
                gap: '10px 20px',
                columnTemplate: '120px 1fr',
                data: [
                    { label: 'Row 1', value: '1235' },
                    { label: 'Row 2', value: '1283791' }
                ],
                rowConfig: [
                    'text:label',
                    ['badge:"value"', 'text-numeric:value']
                ]
            }
        },
        {
            title: 'Using with context and onInit/onChange',
            demo: {
                view: 'context',
                modifiers: [
                    {
                        view: 'grid',
                        rows: [
                            [
                                'text:"First name"',
                                'input{ name: "firstName", value: firstName }'
                            ],
                            [
                                'text:"Choice"',
                                [
                                    {
                                        view: 'toggle-group',
                                        name: 'choice',
                                        data: [
                                            { text: 'Yes', value: true },
                                            { text: 'No', value: false }
                                        ]
                                    },
                                    'input{ name: "comment", value: firstName }'
                                ]
                            ]
                        ]
                    }
                ],
                content: 'struct:# | { firstName, choice, comment }'
            }
        }
    ]
};
