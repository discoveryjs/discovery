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
        },
        {
            title: 'Button as a link',
            demo: {
                view: 'button',
                data: {
                    text: 'Click me',
                    href: '#url',
                    external: true
                }
            }
        }
    ]
});
