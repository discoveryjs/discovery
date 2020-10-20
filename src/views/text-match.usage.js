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
                content: 'text-match:{ text: "Test link testtest", match: /test/i }'
            }
        }
    ]
};
