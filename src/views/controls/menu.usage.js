/* eslint-env browser */
const onChange = Function('return (value) => alert(`Changed to ${value.text}!`)')();

export default {
    demo: {
        view: 'menu',
        data: [
            { text: 'one', href: '#' },
            { text: 'two', href: '#' },
            { text: 'three', href: '#' }
        ]
    },
    examples: [
        {
            title: 'With limit',
            demo: {
                view: 'menu',
                data: [
                    { text: 'one', href: '#' },
                    { text: 'two', href: '#' },
                    { text: 'three', href: '#' }
                ],
                limit: 2
            }
        },
        {
            title: 'With custom item',
            demo: {
                view: 'menu',
                data: [
                    { text: 'one', href: '#' },
                    { text: 'two', href: '#' },
                    { text: 'three', href: '#' }
                ],
                item: 'h1:text'
            }
        },
        {
            title: 'On chage handler',
            demo: {
                view: 'menu',
                onChange: onChange,
                data: [
                    { text: 'one', href: '#' },
                    { text: 'two', href: '#' },
                    { text: 'three', href: '#' }
                ]
            }
        }
    ]
};
