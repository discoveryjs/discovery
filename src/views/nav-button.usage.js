/* eslint-env browser */
const onClick = () => alert('changed!');

export default {
    demo: {
        data: { text: 'I am nav button' },
        view: 'nav-button'
    },
    examples: [
        {
            title: 'With href',
            demo: {
                view: 'nav-button',
                data: { text: 'I am nav button', href: '#' }
            }
        },
        {
            title: 'External link',
            demo: {
                view: 'nav-button',
                data: { text: 'I am nav button', external: true, href: 'https://github.com/discoveryjs/discovery' }
            }
        },
        {
            title: 'On click handler',
            demo: {
                view: 'nav-button',
                data: { text: 'I am nav button'},
                onClick: onClick
            }
        }
    ]
};
