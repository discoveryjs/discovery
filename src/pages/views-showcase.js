import renderUsage from '../views/_usage.js';

const intro = `
## Working with views

In Discovery.js, a presentation is set up as a tree of views.
There are several ways to define a view, each suitable for different cases.
The primary notation is an object, and all other notations are converted to it.
The only required property is \`view\`, which defines the view's name. Any other properties are optional.

\`\`\`discovery-view
{
    view: "view-name"
}
\`\`\`

The following properties are supported by any view:

- \`when\`: Controls view rendering (should it be rendered or not) before input data is transformed (\`data\` is applied).
- \`data\`: Transforms input data for the view and its nested views.
- \`whenData\`: Controls view rendering after input data is transformed.
- \`className\`: Adds class name(s) to the root element of the view if any.
- \`postRender\`: A function to be invoked after view rendering but before placing it in the destination place in the DOM.
- \`tooltip\`: Sets up a tooltip to show on view hovering; can be applied for views with a container only.

The order of evaluation during view rendering:

\`\`\`js
                          input data | output data (the result of "data" evaluation if any)
                                     |
render start ---> [when] --> [data] -|-> [whenData] --> [postRender] --> [className] --> render finish
                                     |
\`\`\`

When the \`data\` property is specified, it changes the flow's data according to the following rules:

- A string: Treated as a query whose result is used as the output data.
- A function like \`fn(data, context)\`: The result of the function invocation is used as the output data.
- Any other value is used as the output data.

> Note: Only \`when\` and \`data\` properties receive input data; any other functions and queries receive the result of the \`data\` property evaluation. When \`data\` is not specified, all queries and functions receive the same input data.

Properties \`when\` and \`whenData\` can take:

- A string: Treated as a query.
- \`true\`: Treated as an empty query, which means that the data itself is examined with no transformation.
- \`undefined\`: Same as when not specified; just render (ignore the property).
- A function like \`fn(data, context)\`.
- Any other value is used as is.

Regardless of how the value is obtained, it is coerced to a boolean.
Please note that Jora rules are used, which means that empty arrays and objects with no own keys are falsy (truthy in JavaScript).
The view is only rendered if the resulting value is truthy.

## Queries for properties

In some cases, it is necessary to compute the value of a property based on the data.
To do this, you can use a string value for a property that starts with \`=\`.
This means that everything after the \`=\` is a query that will take output data and produce a value for the property.
Other values are passed to the view render as is, without any changes.

For example, limit the number of items rendered at once only if there are more than 12 items:

\`\`\`discovery-view
{
    view: 'list',
    limit: '=size() <= 12 ? false : 10'
}
\`\`\`

> Note: In those rare cases when you need to pass a property a string that starts with \`=\`, you can use a query like \`"=some string"\`, e.g., \`{ view: 'example', prop: '="=string="' }\`.

## Shorthand notations

| Shorthand notation | Expands into... |
| --- | --- |
| \`'name'\` | \`{ view: 'name' }\`
| \`'name:<query>'\` | \`{ view: 'name', data: '<query>' }\`
| \`'name{ foo: size() / 2, bar: "qux" }'\` | \`{ view: 'name', foo: '=size() / 2', bar: 'qux' }\`

## List of views

If you need to specify a list of views, you must use an array.
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

## Tooltip

A canonical form for a tooltip setup is an object with fields (all are optional):

\`\`\`js
{
    className: 'string',
    position: 'trigger', // 'trigger' or 'pointer' (default)
    showDelay: false, // true (300ms), false (0ms), a number, or a function which takes a triggerEl and returns showDelay value
    content: 'a view setup'
}
\`\`\`

Instead of such an object, any view notation can be used, i.e., a string, an object with a \`view\` property, an array, or a function:

| Shorthand notation | Expands into... |
| --- | --- |
| \`'name'\` | \`{ content: 'name' }\`
| \`{ view: 'name' }\` | \`{ content: { view: 'name' } }\`
| \`['view', { view: 'name' }]\` | \`{ content: ['view', { view: 'name' }] }\`

The content is rendered into a popup container. When \`className\` is used, it behaves the same as for a view but applies to a popup container.
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
