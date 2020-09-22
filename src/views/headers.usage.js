export default [
    {
        title: 'Variations',
        view: [
            'h1:"Header 1st level"',
            'h2:"Header 2nd level"',
            'h3:"Header 3rd level"',
            'h4:"Header 4th level"',
            'h5:"Header 5th level"'
        ]
    },
    {
        title: 'Complex content',
        view: {
            view: 'h1',
            content: [
                'text:"Text "',
                'link:{text:"Some header"}'
            ]
        }
    }
];
