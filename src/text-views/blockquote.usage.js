export default (view) => ({
    demo: {
        view,
        content: [
            'text:"Some text"',
            { view, content: 'text:"Nested blockquote\\nmulti-line text"' }
        ]
    },
    examples: [
        {
            title: 'Variations',
            demoData: 'Blockquote text...',
            demo: ['note', 'tip', 'important', 'warning', 'caution'].map(name => `blockquote{ kind: "${name}" }`)
        }
    ]
});
