export default [
    {
        title: 'Default usage',
        view: {
            view: 'link',
            data: {
                text: 'I am link',
                href: '#'
            }
        }
    },
    {
        title: 'Link opened in new tab',
        view: {
            view: 'link',
            data: {
                text: 'Discovery github',
                href: 'https://github.com/discoveryjs/discovery',
                external: true
            }
        }
    }
];
