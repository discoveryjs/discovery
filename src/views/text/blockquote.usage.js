export default (view) => ({
    demo: {
        view,
        data: '"Blockquote text"'
    },
    examples: [
        {
            title: 'Variations',
            demoData: 'Blockquote text...',
            demo: ['note', 'tip', 'important', 'warning', 'caution'].map(name => `blockquote{ kind: "${name}" }`)
        }
    ]
});
