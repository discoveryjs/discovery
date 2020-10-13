/* eslint-env browser */

export default (view, group) => ({
    data: {
        text: 'Button'
    },
    demo: {
        view,
        onClick: () => alert('Hello world!')
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}:{ text: "${name}" }`)
        }
    ]
});
