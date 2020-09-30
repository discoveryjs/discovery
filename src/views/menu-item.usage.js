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
        title: 'Preselected item',
        view: {
            view: 'menu',
            data: [
                { text: 'one', href: '#' },
                { text: 'two', href: '#', selected: true},
                { text: 'three', href: '#' }
            ]
        }
    },
    {
        title: 'Disabled item',
        view: {
            view: 'menu',
            data: [
                { text: 'one', href: '#' },
                { text: 'two', href: '#', disabled: true},
                { text: 'three', href: '#' }
            ]
        }
    },
    {
        title: 'External links',
        view: {
            view: 'menu',
            data: [
                { text: 'one', external: true, href: 'https://github.com/discoveryjs/discovery' },
                { text: 'two', external: true, href: 'https://github.com/discoveryjs/discovery' },
                { text: 'three', external: true, href: 'https://github.com/discoveryjs/discovery' }
            ]
        }
    }
];
