/* eslint-env browser */

export default (view, group) => ({
    demo: {
        view,
        onClick: Function('return () => alert("Hello world!")')(),
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
            title: 'Disabled state',
            demo: group.map(name => ({
                view: name,
                disabled: true,
                data: { text: name }
            }))
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
