export default {
    beforeDemo: ['md:"A histogram"'],
    demoData: [0, 1, 2, 3, 4, 5, 6, 1, 2, 3, 1, 2, 5, 25, 14, 10, 25, 22, 20, 20],
    demo: {
        view: 'histogram'
    },
    examples: [
        {
            title: 'Sizes',
            demoData: [0, 1, 2, 3, 4, 5, 6, 1, 2, 3, 1, 2, 5],
            demo: {
                view: 'table',
                context: '{ ...#, values: $ }',
                rows: ['xs', 's', 'm', 'l', 'xl'],
                cols: [
                    { header: 'size' },
                    { header: 'histogram', content: ['text:123', 'histogram{ size: $, dataset: #.values }'] }
                ]
            }
            // ['xs', 's', 'm', 'l', 'xl'].map(size => [
            //     `header:"${size}"`,
            //     `histogram{ size: "${size}" }`
            // ]).flat()
        }
    ]
};
