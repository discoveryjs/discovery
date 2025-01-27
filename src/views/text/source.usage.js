import CodeMirror from 'codemirror';
import { equal } from '../../core/utils/compare.js';

const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';
const lineNum = Function('return num => num + 5')();
const helloWorld = Function('return () => alert("Hello world!")')();

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
            highlightProps: ['refs'],
            demo: {
                view: 'source',
                source: 'let span = "def + ref + global-ref + error";\nlet link = "def + ref + global-ref + error";\n\n// span with tooltip',
                syntax: 'js',
                refs: [
                    { range: [4, 8] },
                    { range: [12, 15], className: 'def' },
                    { range: [18, 21], className: 'ref' },
                    { range: [24, 34], className: 'global-ref' },
                    { range: [37, 42], className: 'error' },
                    { range: [49, 53], type: 'link', href: '#' },
                    { range: [57, 60], type: 'link', href: '#', className: 'def' },
                    { range: [63, 66], type: 'link', href: '#', className: 'ref' },
                    { range: [69, 79], type: 'link', href: '#', className: 'global-ref' },
                    { range: [82, 87], type: 'link', href: '#', className: 'error' },
                    { range: [104, 111], type: 'link', href: '#example', tooltip: {
                        position: 'trigger',
                        content: ['text:"Link to "', 'text:href']
                    } }
                ]
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
        }
    ]
};
