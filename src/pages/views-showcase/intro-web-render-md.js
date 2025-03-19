export default `
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
- \`className\` — Adds CSS class name(s) to the root element of the view (see [ClassName](#!classname)).
- \`postRender\` — A function executed after rendering the view but before placing it in the DOM.
- \`tooltip\` — Sets up a tooltip for the view (only applicable to views with a container element, see [Tooltips](#!tooltips)).

The sequence of property evaluation during rendering (view render lifecycle):

\`\`\`
[start]               render(data, context)
 \\                          |     |
  * when()                  |     | stop rendering when value is falsy
  |\\                        |     |
  | * context() ------------|-----* (async) replace \`context\` with new value
  |  \\                      |     |
  |   * data() -------------*     | (async) replace \`data\` with new value
  |    \\                    |     |
  |     * whenData()        |     | stop rendering when value is falsy
  |     |\\                  |     |
  |     | * (render)        |     | (async) main render logic
  |     |  \\                |     |
  |     |   * postRender()  |     | do something once (render) is done
  |     |    \\              |     |
  |     |     * className() |     | compute className and apply to root element
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

## ClassName

The \`className\` property uses a sequence of transformations to convert its input into a final array of class names. This process can start from different input forms — such as a jora query, a function, a string, or an array — and move through each step until a definitive result is obtained. At each stage, the current value is examined and transformed if applicable; if not, the process continues to the next step:

1. **Jora Query (String Starting with \`=\`)**  
   If the initial value begins with \`=\`, it is treated as a jora query and compiled into a function. That function is then processed as described in the next step.

   \`\`\`discovery-view
   {
       view: "text",
       className: "=isValid ? 'valid' : 'invalid'"
   }
   \`\`\`
   <br>

2. **Function**  
   Once a function is available (either provided directly or obtained from a jora query) it is called with \`(data, context)\`. The return value can be a string or an array, otherwise discarded.

   \`\`\`discovery-view
   {
       view: "text",
       className: (data, context) => data.flag ? "highlighted" : null
   }
   \`\`\`
   <br>

3. **String**  
   Any string (obtained from the previous steps or provided directly) is trimmed and split by whitespace to produce an array of class names, excluding empty entries.

   \`\`\`discovery-view
   {
       view: "text",
       className: "primary emphasized"
   }
   \`\`\`
   <br>

4. **Array**  
   When the value is or becomes an array, each element is processed:
   - If an element is a function, it is called with \`(data, context)\` and its result replaces the function.
   - All falsy or empty results are removed.

   \`\`\`discovery-view
   {
       view: "text",
       className: [
           "base-class",
           data => data.error && "error-indicator",
           ""
       ]
   }
   \`\`\`

   If \`data.error\` is true, this may result in \`class="base-class error-indicator"\`. If \`data.error\` is false, the array would become \`["base-class", false, ""]\`, and after filtering out falsy and empty values, it results in \`class="base-class"\`.

If, after all steps, there are no valid class names, the \`class\` attribute is not applied. This cascading process ensures any initial input — jora query, function, string, or array — is consistently transformed into a meaningful final list of class names.

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
