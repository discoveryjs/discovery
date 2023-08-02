export default {
    demo: {
        view: 'progress',
        progress: .5,
        content: 'text:"Loading..."'
    },
    examples: [
        {
            title: 'With no label (content)',
            demo: {
                view: 'progress',
                progress: .25
            }
        },
        {
            title: 'Custom color',
            demo: {
                view: 'progress',
                progress: .85,
                color: '#bdab77',
                content: 'text:"Yellow progress"'
            }
        }
    ]
};
