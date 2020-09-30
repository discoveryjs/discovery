const onClick = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            data: { text: 'I am nav button' },
            view: 'nav-button'
        }
    },
    {
        title: 'With href',
        view: {
            data: { text: 'I am nav button', href: '#' },
            view: 'nav-button'
        }
    },
    {
        title: 'External link',
        view: {
            data: { text: 'I am nav button', external: true, href: 'https://github.com/discoveryjs/discovery' },
            view: 'nav-button'
        }
    },
    {
        title: 'On click handler',
        view: {
            data: { text: 'I am nav button'},
            onClick: onClick,
            view: 'nav-button'
        }
    }
];
