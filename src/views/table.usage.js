export default [
    {
        title: 'Default usage',
        view: {
            view: 'table',
            data: [
                {
                    col1: 'foo',
                    col2: 'bar',
                    col3: 'baz'
                },
                {
                    col1: 'qux',
                    col2: 'oof',
                    col3: 'zab'
                }
            ]
        }
    },
    {
        title: 'Column settings',
        view: {
            view: 'table',
            cols: [
                {
                    header: 'Header Col 1',
                    data: 'col1',
                    content: 'text:"prefix-" + $'
                },
                {
                    header: 'Header Col 3',
                    data: 'col3',
                    content: 'text:$ + "-suffix"'
                }
            ],
            data: [
                {
                    col1: 'foo',
                    col2: 'bar',
                    col3: 'baz'
                },
                {
                    col1: 'qux',
                    col2: 'oof',
                    col3: 'zab'
                }
            ]
        }
    }
];
