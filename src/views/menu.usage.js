const onChange = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            view: 'menu',
            data: [
                { text: 'one', href: '#' },
                { text: 'two', href: '#' },
                { text: 'three', href: '#' }
            ]
        }
    },
    {
        title: 'With limit',
        view: {
            view: 'menu',
            data: [
                { text: 'one', href: '#' },
                { text: 'two', href: '#' },
                { text: 'three', href: '#' }
            ],
            limit: 1
        }
    },
    {
        title: 'With custom item',
        view: {
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
        view: {
            view: 'menu',
            onChange: onChange,
            data: [
                { text: 'one', href: '#' },
                { text: 'two', href: '#' },
                { text: 'three', href: '#' }
            ]
        }
    }
];
