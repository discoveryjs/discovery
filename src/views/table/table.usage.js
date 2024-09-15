const defaultDemoData = [
    { name: 'Alice', age: 34, occupation: 'Engineer' },
    { name: 'Bob', age: 42, occupation: 'Doctor' },
    { name: 'Charlie', age: 9, occupation: 'Student' },
    { name: 'David', age: 50, occupation: 'Doctor' },
    { name: 'Eve', age: 15, occupation: 'Engineer' }
];

export default {
    beforeDemo: ['md:"A view to display tabular data, usually an array of objects. When no column setup is provided, it infers columns from all keys of objects in the input data and auto-detects sorting for scalar values."'],
    demo: {
        view: 'table'
    },
    demoData: [
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
    ],
    examples: [
        {
            title: 'Columns setup',
            highlightProps: ['cols'],
            beforeDemo: { view: 'md', source: [
                'To set up columns, the `cols` property is used. When an array of objects is used for `cols`, it specifies the exact set of columns. Each object contains a configuration for the `table-cell` view with additional properties that apply at the table level:\n',
                '- `header` – a text for the column header\n',
                '- `sorting` – a sorting function or query for the column\n'
            ] },
            demo: {
                view: 'table',
                cols: [
                    {
                        header: 'Name',
                        sorting: 'name asc',
                        data: 'name'
                    },
                    {
                        header: 'Age',
                        className: 'number',
                        content: 'text:age + " y.o."'
                    }
                ]
            },
            demoData: defaultDemoData
        },
        {
            title: 'Adjastments of infered columns',
            beforeDemo: { view: 'md', source: [
                'In cases where adjustments are needed for inferred columns, an object can be used for the `cols` option, where each key is the name of a property from the objects:',
                '- If a key is missing from the inferred columns, a new column is added with the specified configuration.',
                '- If a key matches one of the inferred columns:',
                '  - If the specified configuration is falsy (i.e., `null`, `undefined`, or `false`), then the column is omitted.',
                '  - Otherwise, options from the specified configuration override properties of the inferred configuration.',
                '',
                '> When specified configuration is a string, it expands into object `{ content: value }`.',
                'The default inferred configuration:',
                '```js',
                '{',
                '    header: key,',
                '    sorting: `$[${JSON.stringify(key)}] ascN`,',
                '    view: "table-cell",',
                '    data: value => value?.[key]',
                '}',
                '```'
            ].join('\n') },
            highlightProps: ['cols'],
            demo: {
                view: 'table',
                cols: {
                    age: 'text:age + " y.o."',
                    occupation: false,
                    extraColumn: {
                        header: 'Extra column',
                        content: 'text:age >= 21 ? "Adult" : "Child"'
                    }
                }
            },
            demoData: defaultDemoData
        },
        {
            title: 'Sorting',
            beforeDemo: { view: 'md', source: [
                'To specify a sorting function, use the `sorting` property in the column options. When a value for `sorting` is set, the column becomes sortable, allowing users to toggle sorting by clicking the column header. The value can be a function `(a, b) => number` or a string representing a jora query that returns a [comparator function](https://discoveryjs.github.io/jora/#article:jora-syntax-functions&!anchor=comparator-functions) (e.g., "name asc, complex.expression desc"), otherwise the value ignores. The function should take two rows\' data (`a` and `b`) and return a negative number if `a` is less than `b`, a positive number if `a` is greater than `b`, or zero otherwise.',
                '',
                '> The `table` view automatically displays a sorting direction indicator (icon) on a column when a comparator function returns `<= 0` or `>= 0` for each pair of consecutive rows.',
                '',
                '> Note: A sorting (comparator) function has no access to the table\'s context, so any attempt to access context (`#`) values within a comparator function produced by a query will return `undefined`.',
                '',
                'The `table` view attempts to infer a sorting function for a column when the `sorting` option is not explicitly specified, by executing the following steps:',
                '- Use `data` if it is a string or function to extract column values from row data; otherwise, use the row\'s data.',
                '- If `content` is a string formatted as `"view-name:query"`, use the `query` to extract a value from the previous step.',
                '  > To prevent sorting inference from the `content` value, specify content in another format, often by wrapping it in an array, e.g., `{ content: "text:name" }` → `{ content: ["text:name"] }`.',
                '- If any condition is met, construct a sorting (comparator) function.',
                '  > If neither `data` nor `content` options meet the conditions, a sorting function cannot be inferred, and the column becomes non-sortable.',
                '',
                '> Note: When inferring a comparator function, the when, whenData, and contentWhen options are not considered for now. If these options are needed to affect sorting, an explicit sorting function should be specified.'
            ].join('\n') },
            highlightProps: ['sorting', 'data', 'content'],
            demo: {
                view: 'table',
                cols: [
                    { header: 'Sorting from data', data: 'name' },
                    { header: 'Sorting from content', content: 'text:age' },
                    { header: 'Sorting from data&content', data: '{ name, age }', content: 'text:`${age} ${name}`' },
                    { header: 'Explicit sorting', sorting: 'name asc, age desc', content: ['text:`${name} ${age}`'] }
                ]
            },
            demoData: defaultDemoData
        },
        {
            title: 'Displaying non-object values',
            beforeDemo: ['md:"When input data (an array) contains non-object values, such values are display using `struct` view in a single cell spanning all the columns"'],
            highlightProps: ['data', 'valueCol'],
            demo: [
                'h3:"Table with non-object values"',
                { view: 'table', data: [
                    123,
                    'string',
                    null,
                    { foo: 1, bar: 2 },
                    [1, 2, 3]
                ] },
                'h3:"Enforce displaying of a [value] column"',
                { view: 'table', valueCol: true }
            ],
            demoData: defaultDemoData
        },
        {
            title: 'Setup cell display',
            beforeDemo: { view: 'md', source: [
                'To manage cell display, the following options are available in the `cols` setting:',
                '- `colWhen` (similar to `when` and `whenData` options) allows disabling column rendering based on the table\'s data.',
                '- `contentWhen` (similar to `when` and `whenData` options) allows disabling cell content rendering based on the row\'s data.',
                '- `when` and `whenData` apply to `table-cell` and behave the same way as they do for any view, to disabling rendering of the cell itself.',
                '- `colSpan` allows setting a relevant attribute for a table cell. (Note: subsequent cells should be disabled using `when` or `whenData`).'
            ].join('\n') },
            highlightProps: ['contentWhen', 'colWhen', 'colSpan', 'when'],
            demo: {
                view: 'table',
                data: '.({ name, age, fare: age > 21 ? "Full" : age > 12 ? "Half" })',
                cols: {
                    name: {
                        contentWhen: '$ != "Bob"'
                    },
                    age: {
                        colWhen: 'size() > 10'
                    },
                    fare: {
                        colSpan: '=fare ? 1 : 2',
                        content: {
                            data: 'fare',
                            view: 'switch',
                            content: [
                                { when: '$', content: 'text' },
                                { content: 'text:"Not applicable"' }
                            ]
                        }
                    },
                    price: {
                        when: 'fare',
                        data: 'fare = "Full" ? 50 : 25',
                        content: 'text:"$" + $'
                    }
                }
            },
            demoData: defaultDemoData
        },
        {
            title: 'Cell details',
            beforeDemo: { view: 'md', source: 'Cells can provide an additional detail view for its value which displaying when a user click on the cell, and hides on a click by the same cell or other cell with details. To enable and soecify content for detailed view, `details` option is used. By default, `details` is enabled for object and non-empty array values when no `content` is specified, by displaying a value with `struct` view.' },
            highlightProps: ['details'],
            demo: {
                view: 'table',
                cols: [
                    { header: 'Group', data: 'group' },
                    { header: 'Default', data: 'peoples' },
                    { header: 'Custom details', data: 'peoples', details: ['h2:"Custom detail views"', 'table'] },
                    { header: 'Disable default', data: 'peoples', details: false }
                ]
            },
            demoData: [
                { group: 'Kids', max: 21 },
                { group: 'Adults', min: 21 },
                { group: 'All' }
            ].map(({ group, min = 0, max = 100 }) => ({
                group,
                peoples: defaultDemoData.filter(item => item.age > min && item.age < max)
            }))
        }
    ]
};
