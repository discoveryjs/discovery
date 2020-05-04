export default [
    {
        title: 'Variations',
        view: [
            'alert:"Default alert"',
            'alert-success:"Success alert"',
            'alert-danger:"Danger alert"',
            'alert-warning:"Warning alert"'
        ]
    },
    {
        title: 'Default usage',
        view: {
            view: 'alert',
            data: '"Hello world!"'
        }
    },
    {
        title: 'Complex content',
        view: {
            view: 'alert',
            content: [
                'h3:"Some header"',
                'text:"Hello world!"'
            ]
        }
    }
];
