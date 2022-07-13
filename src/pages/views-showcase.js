import renderUsage from '../views/_usage.js';

const intro = `
## Working with views

A presentation in Discovery.js is setting up as a tree of views.
There are several ways to define a view, some may be more convenient in one case, others in another.
The main notation is an object, all other notations are converted to it.
The only required property is \`view\` which defines a view name, any other properties are optional:

\`\`\`discovery-view
{
    view: "view-name"
}
\`\`\`

The following properties are supported by any view:

- \`when\` – control view rendering (should it be rendered or not) before an input data is transformed (\`data\` is applied)
- \`data\` – transform input data for the view and its nested views
- \`whenData\` – control view rendering after an input data is transformed
- \`className\` – add class name(s) to the root element of view if any
- \`postRender\` - a function which should be invoked after view rendering but before placing to destination place in DOM

The order of evaluation during a view render:

\`\`\`js
render start                                               
|          input data  | output data (the result of "data" evaluation if any)
\\-> [when] --> [data] --> [whenData] --> [postRender] --> [className] --> render finish
\`\`\`

When \`data\` property is specified, it changes flow's data according the following rules:

- a string – treated as a query which result is used as the output data
- a function like \`fn(data, context)\` – the result of the function invocation is used as the output data
- any other value used as the output data

> Note: Only \`when\` and \`data\` properties get an input data, any other functions and queries receive
a result of \`data\` property evalution. When \`data\` is not specified all the queries and functions
receive the same input data.

Properties \`when\` and \`whenData\` can take:

- a string – treated as a query
- \`true\` – treated as a empty query which mean that the data itself is examinated with no any transformation
- \`undefined\` – same when not specified, just render (ignore the property)
- a function like \`fn(data, context)\`
- any other value used as is

Regardless of how the value is obtained, it is coerce to a boolean.
Plase note, that Jora rules are used which mean that empty arrays and object with no own keys are falsy (truthy in JavaScript).
The view is only rendered if the resulting value is truthy.

## Queries for properties

In some cases, it is necessary to compute the value of a property based on the data.
To do this, you can use a string value for a property that starts with \`=\`.
This will mean that everything after the \`=\` is a query which will take output data and produce a value for the property.
Other values are passed to the view render as is, without any changes.

In the following, limit number of items rendered at once only if there are more than 12 items:

\`\`\`discovery-view
{
    view: 'list',
    limit: '=size() <= 12 and 10'  // the same as '=size() <= 12 ? false : 10'
}
\`\`\`

> Note: In those rare cases when you need to pass to a property a string that starts with \`=\`,
you can use a query like \`="=some string"\`,<br>e.g. \`{ view: 'example', prop: '="=string="' }\`

## Shorthand notations

| Shorhand notation | Expanding into ... |
| --- | --- |
| \`'name'\` | \`{ view: 'name' }\`
| \`'name:<query>'\` | \`{ view: 'name', data: '<query>' }\`
| \`'name{ foo: size() / 2, bar: "qux" }'\` | \`{ view: 'name', foo: '=size() / 2', bar: 'qux' }\`

## List of views

If you need to specify a list of views, then you must use an array.
An array with view definitions can be passed anywhere a view is accepted as a value.

\`\`\`discovery-view
[
    {
        view: 'list',
        item: [
            'text:name',
            { view: 'badge', data: 'something.size()' }
        ]
    },
    'table{ limit: 10 }'
]
\`\`\`
`;

export default function(host) {
    // const fixture = () => ({
    //     views: Object.fromEntries(host.view.entries),
    //     pages: Object.fromEntries(host.page.entries)
    // });

    host.page.define('views-showcase', {
        view: 'context',
        data: () => [...host.view.values],
        modifiers: [
            {
                view: 'block',
                className: 'sidebar',
                content: {
                    view: 'content-filter',
                    content: {
                        view: 'menu',
                        name: 'view',
                        limit: false,
                        data: `
                            .[name ~= #.filter]
                            .sort(name asc)
                            .({ ..., disabled: no options.usage })
                        `,
                        item: 'text-match:{ text: name, match: #.filter }'
                    }
                }
            }
        ],
        content: {
            view: 'block',
            className: 'content',
            data: '$[=> name=(#.view.name or #.id)]',
            content: {
                view: 'switch',
                content: [
                    { when: 'no $ and #.id', content: 'alert-warning:"View \\"" + #.id + "\\" not found"' },
                    { when: 'no $', content: [
                        'h1:"Views showcase"',
                        'alert:"← Select a view to get details"',
                        { view: 'markdown', source: intro }
                    ] },
                    { content: [
                        { view: 'context', postRender: function(el, config, data, context) {
                            // FIXME: make it simpler
                            host.setPageRef(data.name);
                            host.cancelScheduledRender();
                            context.id = host.pageRef;
                        } },

                        renderUsage(host)
                    ] }
                ]
            }
        }
    }, {
        sidebar: false
    });
}
