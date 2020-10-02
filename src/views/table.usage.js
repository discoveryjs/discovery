export default {
    demo: {
        view: 'table',
        data: [
            {
                foo: 1,
                bar: 'bar',
                baz: 'zab'
            },
            {
                foo: 2,
                baz: 'xyz'
            },
            {
                foo: 3,
                bar: 'qux',
                baz: 'baz'
            },
            {
                foo: 4,
                bar: 'aaa',
                baz: 'abc'
            }
        ]
    },
    examples: [
        {
            title: 'Columns setup',
            demo: {
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
    ]
};
