/* eslint-env browser */
const onToggle = () => alert('toggled!');
const createTree = ([len, ...rest], path = '') => {
    const result = [];

    for (let i = 0; i < len; i++) {
        const leafPath = path + '.' + (i + 1);

        result.push({
            title: leafPath,
            children: rest.length ? createTree(rest, leafPath) : null
        });
    }

    return result;
};

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
        },
        {
            title: 'limitLines',
            demo: {
                view: 'tree',
                item: 'text:title',
                limitLines: 7,
                data: createTree([5, 3, 3])
            }
        }
    ]
};
