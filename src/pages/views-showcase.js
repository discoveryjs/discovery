import renderUsage from '../views/_usage.js';

const intro = `
## Working with views

In Discovery.js, presentations are organized as a tree of views. Views are defined using object notation, where the \`view\` property specifies the type, and additional properties allow further customization.

\`\`\`discovery-view
{
    view: "view-name"
}
\`\`\`

A view definition takes \`data\` and \`context\` values, which can be used to define properties and control rendering. Views can transform data and context (using the \`data\` and \`context\` properties) for use by the view and its descendant views, enabling clear data flow. Views are rendered by calling the render method:

\`\`\`js
discovery.render(containerEl, viewDefinition, data, context)
\`\`\`

Discovery.js is designed to be declarative. For dynamic calculations or event handling, [jora](https://discoveryjs.github.io/jora/) queries are preferred over JavaScript functions.

Each view can use the following properties:

- \`view\` (required) — Specifies the view type.
- \`when\` — Controls whether the view should be rendered. Evaluated before \`data\` transformation.
- \`context\` — Transforms the input context for the view and its nested views.
- \`data\` — Transforms the input data for the view and its nested views.
- \`whenData\` — Controls rendering based on the computed \`data\`. Evaluated after \`context\` and \`data\` are set.
- \`className\` — Adds CSS class name(s) to the root element of the view.
- \`postRender\` — A function executed after rendering the view but before placing it in the DOM.
- \`tooltip\` — Sets up a tooltip for the view (only applicable to views with a container element).

The sequence of property evaluation during rendering (view render lifecycle):

\`\`\`
[start]               render(data, context)
 \\                          |     |
  * when()                  |     | // stop rendering when value is falsy
  |\\                        |     |
  | * context() ------------|-----* // replace \`context\` with new value
  |  \\                      |     |
  |   * data() -------------*     | // replace \`data\` with new value
  |    \\                    |     |
  |     * whenData()        |     | // stop rendering when value is falsy
  |     |\\                  |     |
  |     | * (render)        |     |
  |     |  \\                |     |
  |     |   * postRender()  |     |
  |     |    \\              |     |
  |     |     * className() |     |
  |     |      \\            V     V
  +-----+-----> * [finish render]
\`\`\`

- \`context\` and \`data\` — Modify the flow of context or data based on the provided value:
  - **String** — Treated as a jora query, and its result is used.
  - **Function** (\`fn(data, context)\`) — The result of the function invocation is used.
  - **Other values** — Directly used as a new value for data or context.
- \`when\` and \`whenData\` — Determine if a view should be rendered:
  - **String** — Treated as a jora query.
  - \`true\` — Evaluated as an empty query, meaning the data itself is tested for truthiness.
  - \`undefined\` — Treated as not specified, allowing rendering.
  - **Function** (\`fn(data, context)\`) or other values — Evaluated for truthiness.
  > Note: In jora, empty arrays and objects with no own keys are falsy, unlike JavaScript where they are truthy.

\`\`\`discovery-view
{
    view: 'list',
    data: 'some.list.sort(name asc)', // Fetch an array for the list view, based on current data
    whenData: 'size() > 0',  // Check if the array has elements, skip rendering if empty
    item: 'text:name' // Render each element as text, displaying the name
}
\`\`\`

## Computable property values

If a property starts with \`=\`, it indicates a jora query used to compute the property's value before a rendering.

\`\`\`discovery-view
{
    view: 'list',
    limit: '=size() <= 12 ? false : 10' // Dynamically computes the limit based on flow data
}
\`\`\`

> To pass a literal string that starts with \`=\`, use a query like \`'="=some string"'\`.

## Shorthand notations

Discovery.js supports shorthand notations for defining views, making the configuration more concise:

| Shorthand notation                      | Expanded form                                      |
| --------------------------------------- | -------------------------------------------------- |
| \`'name'\`                                | \`{ view: 'name' }\`                                 |
| \`'name:<query>'\`                        | \`{ view: 'name', data: '<query>' }\`                |
| \`'name{ foo: size() / 2, bar: "qux" }'\` | \`{ view: 'name', foo: '=size() / 2', bar: 'qux' }\` |

## Lists of views

Multiple views can be combined into a list using an array:

\`\`\`discovery-view
{
    view: 'list',
    item: [ // render two views as a content of a list item
        'text:name',
        { view: 'badge', data: 'something.size()' }
    ]
}
\`\`\`

## Tooltips

Tooltips can be configured using a simple view definition or an object with additional settings. When the \`tooltip\` value is a view definition, it becomes the \`content\` of the tooltip.

\`\`\`discovery-view
{
    view: 'button',
    tooltip: 'md:"Some **content**"'
}
\`\`\`

\`\`\`discovery-view
{
    view: 'button',
    tooltip: {
        position: 'trigger',
        content: 'md:"Some **content**"'
    }
}
\`\`\`

| Tooltip value                     | Normalized tooltip config                      |
| --------------------------------- | ---------------------------------------------- |
| \`'shorthand-view-notation'\`       | \`{ content: 'shorthand-view-notation' }\`       |
| \`{ view: 'name', ... }\`           | \`{ content: { view: 'name', ... } }\`           |
| \`['view', { view: 'name', ... }]\` | \`{ content: ['view', { view: 'name', ... }] }\` |

Tooltip options:

- \`className\` — Additional class names for the tooltip element.
- \`position\` — Where the tooltip is positioned. Options are \`'trigger'\` or \`'pointer'\` (default).
- \`positionMode\` — Positioning mode. Options are \`'natural'\` (default) or \`'safe'\`.
- \`pointerOffsetX\` — Horizontal offset from the pointer (default: 3).
- \`pointerOffsetY\` — Vertical offset from the pointer (default: 3).
- \`showDelay\` — Delay before showing the tooltip. Options are \`true\` (300ms, default), \`false\` (0ms), a number, or a function that returns a boolean or numeric value.
- \`content\` — View configuration for tooltip content.
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
                content: [
                    {
                        view: 'link',
                        className: 'index-page-link',
                        href: '="".pageLink(#.page)',
                        text: 'Index page'
                    },
                    {
                        view: 'content-filter',
                        content: {
                            view: 'menu',
                            name: 'view',
                            limit: false,
                            emptyText: 'Nothing matched',
                            item: 'text-match:{ text: name, match: #.filter }',
                            data: `
                                .[name ~= #.filter]
                                .sort(name asc)
                                .({ ..., disabled: no options.usage })
                            `
                        }
                    }
                ]
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
