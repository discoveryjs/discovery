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
            highlightProps: ['expanded'],
            demo: {
                view: 'tree',
                item: 'text:text',
                expanded: 999
            },
            demoData: {
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
        {
            title: 'With empty text',
            highlightProps: ['emptyText'],
            demo: {
                view: 'tree',
                emptyText: 'This tree is empty',
                data: null
            }
        },
        {
            title: 'With toggle handler',
            highlightProps: ['onToggle'],
            demo: {
                view: 'tree',
                item: 'text:text',
                onToggle: onToggle
            },
            demoData: {
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
        {
            title: 'limitLines',
            highlightProps: ['limitLines'],
            demoData: createTree([5, 3, 3]),
            demo: {
                view: 'tree',
                item: 'text:title',
                limitLines: 7
            }
        }
    ]
};
