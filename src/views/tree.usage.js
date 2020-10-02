/* eslint-env browser */
const onToggle = () => alert('toggled!');

export default {
    demo: {
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
    },
    examples: [
        {
            title: 'Expanded tree',
            demo: {
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
            demo: {
                view: 'tree',
                emptyText: 'This tree is empty',
                data: null
            }
        },
        {
            title: 'With toggle handler',
            demo: {
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
    ]
};
