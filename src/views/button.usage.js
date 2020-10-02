/* eslint-env browser */

export default (view, group) => ({
    demo: {
        view,
        onClick: () => alert('Hello world!'),
        data: {
            text: 'Button'
        }
    },
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => `${name}:{ text: "${name}" }`)
        }
    ]
});
