export default {
    demo: {
        view: 'text-match',
        data: {
            text: 'I am matched text or a text with matches!',
            match: /match/
        }
    },
    examples: [
        {
            title: 'Raw string as match',
            demo: {
                view: 'text-match',
                data: {
                    text: 'I am matched text or a text with matches!',
                    match: 'match'
                }
            }
        },
        {
            title: 'Using with a link',
            demo: {
                view: 'link',
                data: { href: '#' },
                content: 'text-match:{ text: "Test link", match: /\\w+/i }'
            }
        },
        {
            title: 'Various configurations',
            demo: {
                view: 'table',
                cols: [
                    { header: 'text-match', content: 'text-match' },
                    { header: 'Config', content: 'struct' }
                ],
                data: [
                    null,
                    { },
                    { },
                    {
                        match: 'test'
                    },
                    {
                        match: 'Test'
                    },
                    {
                        match: 'test',
                        ignoreCase: true
                    },
                    {
                        match: 'Test',
                        ignoreCase: true
                    },
                    {
                        match: /test/
                    },
                    {
                        match: /test/g
                    },
                    {
                        match: /test/i
                    },
                    {
                        match: /test/,
                        ignoreCase: true
                    },
                    {
                        match: /test/g,
                        ignoreCase: true
                    }
                ].map((item, idx) => idx > 1 ? { text: 'test Test', ...item } : item)
            }
        }
    ]
};
