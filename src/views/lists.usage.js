export default [
    {
        title: 'Default usage',
        view: {
            view: 'list',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Item config',
        view: {
            view: 'list',
            item: {
                view: 'text',
                data: '"prefix-" + $'
            },
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Inline list',
        view: {
            view: 'inline-list',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Comma list',
        view: {
            view: 'comma-list',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Unordered list',
        view: {
            view: 'ul',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Ordered list',
        view: {
            view: 'ol',
            data: ['one', 'two', 'three', 'four']
        }
    }
];
