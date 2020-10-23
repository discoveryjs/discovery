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
