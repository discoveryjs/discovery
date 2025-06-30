import CodeMirror from 'codemirror';
import { equal } from '../../core/utils/compare.js';

const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';
const lineNum = Function('return num => num + 5')();
const helloWorld = Function('return () => alert("Hello world!")')();
const diffPath = '/src/views/text/source.js';
const diffExample = `diff --git a${diffPath} b${diffPath}
index 302b02e..62ea1be 100644
--- a${diffPath}
+++ b${diffPath}
@@ -18,7 +18,8 @@ CodeMirror.modeToMime = {
     html: 'text/html',
     css: 'text/css',
     scss: 'text/x-scss',
-    less: 'text/x-less'
+    less: 'text/x-less',
+    diff: 'text/x-diff'
 };
 
 function codeMirrorHighlight(modespec, host) {`;

function getSupported() {
    const modes = new Set();
    const mimeMode = new Map();
    const resolveMode = ref => {
        const mode = CodeMirror.resolveMode(ref);
        const key = [...mimeMode.keys()].find(key => equal(key, mode));

        if (key) {
            return key;
        }

        mimeMode.set(mode, {
            name: new Set(),
            mime: new Set()
        });

        return mode;
    };

    for (const [alias, mime] of Object.entries(CodeMirror.modeToMime)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        mode.name.add(alias);
        modes.add(alias);
    }

    for (const [mime, alias] of Object.entries(CodeMirror.mimeModes)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        if (typeof alias === 'string') {
            mode.name.add(alias);
            modes.add(alias);
        }
    }

    for (const [alias] of Object.entries(CodeMirror.modes)) {
        if (!modes.has(alias)) {
            const mode = CodeMirror.modes[alias];

            if (!mimeMode.has(mode)) {
                mimeMode.set(mode, {
                    name: new Set(),
                    mime: []
                });
            }

            mimeMode.get(mode).name.add(alias);
        }
    }

    return [...mimeMode.values()].map(syntax => ({
        name: [...syntax.name],
        mime: [...syntax.mime]
    }));
}

export default {
    demo: {
        view: 'source',
        syntax: 'js',
        source: codeExample
    },
    examples: [
        {
            title: 'Supported syntaxes',
            beforeDemo: [
                'md:"Following values (for both `name` and `mime`) are supported for `syntax` option:"',
                'html:"<br>"',
                {
                    view: 'table',
                    data: getSupported,
                    cols: {
                        name: { content: 'comma-list:name' },
                        mime: { content: 'comma-list:mime' }
                    }
                },
                'html:"<br>"',
                'md:"More syntaxes may be added via `import \'codemirror/mode/[name]/[name]\';`"'
            ],
            source: false
        },
        {
            title: 'Diff syntax example',
            demo: {
                view: 'source',
                syntax: 'diff',
                source: diffExample
            }
        },
        {
            title: 'Max content size for syntax highlight',
            highlightProps: ['maxSourceSizeToHighlight'],
            beforeDemo: ['md:"By default a syntax highlighing is not appling to a source longer than 250Kb. Option `maxSourceSizeToHighlight` is using to change max size of source to be syntax highlighted."'],
            demo: {
                view: 'source',
                source: codeExample,
                syntax: 'js',
                maxSourceSizeToHighlight: 4
            }
        },
        {
            title: 'Custom line numbers',
            highlightProps: ['lineNum'],
            demo: [
                {
                    view: 'source',
                    source: codeExample,
                    syntax: 'js',
                    lineNum
                },
                {
                    view: 'source',
                    source: codeExample,
                    syntax: 'js',
                    lineNum: '==> $ + 12345'
                }
            ]
        },
        {
            title: 'Hide line numbers',
            highlightProps: ['lineNum'],
            beforeDemo: ['md:"Pass falsy value to `lineNum` option to hide line numbers:"'],
            demo: {
                view: 'source',
                source: codeExample,
                syntax: 'js',
                lineNum: false
            }
        },
        {
            title: 'Customise copy source button',
            beforeDemo: [
                'md:"By default, the `source` view includes a \\"copy to clipboard\\" button. To customize its behavior use the `actionCopySource` option, which accepts the following values:\\n- `true` (default) – displays a button that copies the entire source to the clipboard;\\n- A function `({ source, syntax, lineNum, refs, ... }) => string` – displays a button that calls the provided function on click to determine the text to copy;\\n- Anything else – hides the copy button, i.e. the button is not rendered."'
            ],
            highlightProps: ['actionCopySource'],
            demo: [
                {
                    view: 'source',
                    actionCopySource: '==> source[0:10]',
                    source: '// In this example, the copy button copies only the first 10 characters of the source'
                },
                {
                    view: 'source',
                    actionCopySource: false,
                    source: '// This example demonstrates how to disable the default copy button'
                }
            ]
        },
        {
            title: 'Additional action buttons',
            highlightProps: ['actionButtons'],
            demo: {
                view: 'source',
                actionButtons: [
                    {
                        view: 'button',
                        content: 'text:"Say \\"Hello world\\""',
                        onClick: helloWorld
                    }
                ],
                source: codeExample,
                syntax: 'js'
            }
        },
        {
            title: 'Prelude and postlude slots',
            highlightProps: [
                'prelude',
                'postlude'
            ],
            demo: {
                view: 'source',
                prelude: [
                    'text:"Prelude:"',
                    'struct:{ data: $, context: # }'
                ],
                postlude: [
                    'text:"Postlude:"',
                    'struct:{ data: $, context: # }'
                ],
                source: codeExample,
                syntax: 'js'
            }
        },
        {
            title: 'Highlight ranges',
            highlightProps: ['ranges'],
            beforeDemo: { view: 'md', source: [
                'The `ranges` option (formerly `refs`) allows highlighting specific parts of the source text or turning them into links. The `ranges` value must be an array of objects with the following fields:',
                '\n',
                '- `range` (required) - an array of two numbers representing the start and end offsets of the span',
                '- `className` - class name(s) for the wrapping element. This can be a string (a space-separated list of class names) or an array of strings. Predefined class names include `def`, `ref`, `global-ref`, and `error`, each specifying a particular style for the span.',
                '- `href` - when specified, the range becomes a link (`<a>`), otherwise, the range is a regular span (`<span>`)',
                '- `tooltip` - config for a [tooltip](#views-showcase&!anchor=tooltips), similar to tooltips in other views',
                '- `marker` - a value added to the wrapping element as a `data-marker` attribute'
            ] },
            demo: {
                view: 'source',
                source: 'let span = "def + ref + global-ref + error";\nlet link = "def + ref + global-ref + error";\n\n// span with tooltip',
                syntax: 'js',
                ranges: [
                    { range: [4, 8] },
                    { range: [12, 15], className: 'def' },
                    { range: [18, 21], className: 'ref' },
                    { range: [24, 34], className: 'global-ref' },
                    { range: [37, 42], className: 'error' },
                    { range: [49, 53], href: '#' },
                    { range: [57, 60], href: '#', className: 'def' },
                    { range: [63, 66], href: '#', className: 'ref' },
                    { range: [69, 79], href: '#', className: 'global-ref' },
                    { range: [82, 87], href: '#', className: 'error' },
                    { range: [104, 111], href: '#example', tooltip: {
                        position: 'trigger',
                        content: 'text:`Link to ${href}`'
                    } }
                ]
            }
        },
        {
            title: 'Marks',
            highlightProps: ['marks'],
            beforeDemo: { view: 'md', source: [
                'The `marks` option allows injecting visual or text marks at specific points in the source text. The `marks` value must be an array of objects with the following fields:',
                '\n',
                '- `offset` (required) - the offset in the source where the mark is injected.',
                '- `kind` - the type of mark, which can be one of the following: `span` (default), `dot`, `self` (self value), `nested` (nested value), `total` (total value), or `none`',
                '- `className` - class name(s) for the wrapping element. This can be a string (a space-separated list of class names) or an array of strings. Predefined class names include `def`, `ref`, `global-ref`, `error`, and `inactive`, each specifying a particular style for the mark.',
                '- `href` - when specified, the mark becomes a link (`<a>`), otherwise, it is a regular span (`<span>`)',
                '- `content` - view config for content (e.g., `\'text:"hello"\'` or `{ view: \'name\', ... }`). If not specified, `kind` is ignored and defaults to `dot` (since content is optional for marks of type `dot`)',
                '- `prefix` (ignored when `kind` is `dot`) - text to display before the content of mark, styled with a dimmed color ',
                '- `postfix` (ignored when `kind` is `dot`) - text to display after the content of mark, styled with a dimmed color',
                '- `tooltip` - config for a [tooltip](#views-showcase&!anchor=tooltips), similar to tooltips in other views',
                '- `marker` - a value added to the wrapping element as a `data-marker` attribute'
            ] },
            demo: {
                view: 'source',
                source: 'let span = "def + ref + global-ref + error";\nlet link = "def + ref + global-ref + error";\n\n// kinds: self nested total none\n// kind="dot": default def ref global-ref error inactive\n// kind="dot" with tooltip: \n// kind="dot" with href: \n// mark with tooltip',
                syntax: 'js',
                marks: [
                    { offset: 4 },
                    { offset: 4, kind: 'dot', content: 'text:"dot with text"' },
                    { offset: 4, content: 'text:"mark"' },
                    { offset: 12, className: 'def', content: 'text:"def"' },
                    { offset: 18, className: 'ref', content: 'text:"ref"' },
                    { offset: 24, className: 'global-ref', content: 'text:"global-ref"' },
                    { offset: 37, className: 'error', content: 'text:"error"' },

                    { offset: 49, href: '#' },
                    { offset: 49, href: '#', kind: 'dot', content: 'text:"dot with text"' },
                    { offset: 49, href: '#', content: 'text:"link"' },
                    { offset: 57, href: '#', className: 'def', content: 'text:"def"' },
                    { offset: 63, href: '#', className: 'ref', content: 'text:"ref"' },
                    { offset: 69, href: '#', className: 'global-ref', content: 'text:"global-def"' },
                    { offset: 82, href: '#', className: 'error', content: 'text:"error"' },

                    { offset: 101, kind: 'self', content: 'text:"123"', href: '#', postfix: 'ms' },
                    { offset: 106, kind: 'nested', content: 'text:"123"', postfix: 'ms' },
                    { offset: 113, kind: 'total', content: 'text:"123"', postfix: 'ms' },
                    { offset: 119, kind: 'none', content: 'text:"none"' },
                    { offset: 123, kind: 'none', content: 'text:"⚠️"' },
                    { offset: 123, kind: 'none', content: 'text:"none"', prefix: 'prefix', postfix: ' postfix', href: '#test' },

                    { offset: 139, kind: 'dot' },
                    { offset: 147, kind: 'dot', className: 'def' },
                    { offset: 151, kind: 'dot', className: 'ref' },
                    { offset: 155, kind: 'dot', className: 'global-ref' },
                    { offset: 166, kind: 'dot', className: 'error' },
                    { offset: 172, kind: 'dot', className: 'inactive' },

                    ...['', 'def', 'ref', 'global-ref', 'error', 'inactive'].map(className => ({
                        offset: 209,
                        kind: 'dot',
                        className,
                        tooltip: 'text:' + JSON.stringify(className || 'default')
                    })),

                    ...['', 'def', 'ref', 'global-ref', 'error', 'inactive'].map(className => ({
                        offset: 235,
                        kind: 'dot',
                        className,
                        href: '#' + (className || 'default')
                    })),

                    { offset: 256, href: '#example', content: 'text:"show tooltip"', tooltip: {
                        position: 'trigger',
                        content: 'text:`Link to ${href}`'
                    } }
                ]
            }
        }
    ]
};
