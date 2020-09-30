const onToggle = () => {
    alert('toggled!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            view: 'tree',
            item: 'text:text',
            data: {
                text: 'Root',
                children: [
                    { text: 'Child' },
                    { text: 'Another child', children: [
                        { text: 'Lvl 2 child' },
                        { text: 'Lvl 2 child' }
                    ] }
                ]
            }
        }
    },
    {
        title: 'Expanded tree',
        view: {
            view: 'tree',
            item: 'text:text',
            expanded: 999,
            data: {
                text: 'Root',
                children: [
                    { text: 'Child' },
                    { text: 'Another child', children: [
                        { text: 'Lvl 2 child' },
                        { text: 'Lvl 2 child' }
                    ] }
                ]
            }
        }
    },
    {
        title: 'With empty text',
        view: {
            view: 'tree',
            emptyText: 'No items',
            data: null
        }
    },
    {
        title: 'With toggle handler',
        view: {
            view: 'tree',
            item: 'text:text',
            onToggle: onToggle,
            data: {
                text: 'Root',
                children: [
                    { text: 'Child' },
                    { text: 'Another child', children: [
                        { text: 'Lvl 2 child' },
                        { text: 'Lvl 2 child' }
                    ] }
                ]
            }
        }
    }
];
