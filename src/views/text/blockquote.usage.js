export default (view) => ({
    demo: {
        view,
        content: [
            'text:"Blockquote text..."',
            'blockquote:"Nested blockquote\\nmulti-line text..."'
        ]
    },
    examples: [
        {
            title: 'Variations',
            demoData: 'Blockquote text...',
            demo: [
                { kind: '', text: 'Default blockquote without any kind.' },
                { kind: 'note', text: 'Useful information that users should know, even when skimming content.' },
                { kind: 'tip', text: 'Helpful advice for doing things better or more easily.' },
                { kind: 'important', text: 'Key information users need to know to achieve their goal.' },
                { kind: 'warning', text: 'Urgent info that needs immediate user attention to avoid problems.' },
                { kind: 'caution', text: 'Advises about risks or negative outcomes of certain actions.' }
            ]
                .map(({ kind, text }) => kind
                    ? `${view}{ kind: "${kind}", data: ${JSON.stringify(text)} }`
                    : `${view}:${JSON.stringify(text)}`
                )
        }
    ]
});
