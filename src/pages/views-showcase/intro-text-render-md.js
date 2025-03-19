export default `
## Working with text views

Text views in Discovery.js follow the same principles as regular (web-based) views but are simplified due to constraints inherent to textual representation, such as the absence of interactivity and styling.

Text views are managed through the \`Model#textView\` interface, enabling text rendering for any model type:

\`\`\`js
model.textView.define('text-view-name', render);
// ...
const renderTree = model.textView.render('text-view-name:...');
const { text } = model.textView.serialize(renderTree);
\`\`\`

Each text view supports a limited set of properties compared to regular views, but these retain the same semantics:

- \`view\` (required) — Specifies the view type.
- \`when\` — Controls whether the view should be rendered. Evaluated before \`data\` transformation.
- \`context\` — Transforms the input context for the view and its nested views.
- \`data\` — Transforms the input data for the view and its nested views.
- \`whenData\` — Controls rendering based on the computed \`data\`. Evaluated after \`context\` and \`data\` are set.
`;
