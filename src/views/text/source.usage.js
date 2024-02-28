import CodeMirror from 'codemirror';
import { equal } from '../../core/utils/compare.js';

const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';
const lineNum = new Function('return num => num + 5')();

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
        data: { syntax: 'js', content: codeExample }
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
            demo: {
                view: 'source',
                data: {
                    content: codeExample,
                    syntax: 'js',
                    lineNum
                }
            }
        },
        {
            title: 'Hide line numbers',
            highlightProps: ['lineNum'],
            beforeDemo: ['md:"Pass falsy value to `lineNum` option to hide line numbers:"'],
            demo: {
                view: 'source',
                data: {
                    content: codeExample,
                    syntax: 'js',
                    lineNum: false
                }
            }
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
                        onClick: new Function('return () => alert("Hello world!")')()
                    }
                ],
                data: {
                    content: codeExample,
                    syntax: 'js'
                }
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
                data: {
                    content: codeExample,
                    syntax: 'js'
                }
            }
        },
        {
            title: 'Highlight ranges',
            highlightProps: ['refs'],
            demo: {
                view: 'source',
                data: {
                    syntax: 'js',
                    content: codeExample,
                    refs: [
                        { range: [4, 8] },
                        { range: [21, 28], type: 'link', href: '#example', tooltip: {
                            position: 'trigger',
                            content: ['text:"Link to "', 'text:href']
                        } }
                    ]
                }
            }
        },
        {
            title: 'Max content size for syntax highlight',
            highlightProps: ['maxSourceSizeToHighlight'],
            beforeDemo: ['md:"By default a syntax highlighing is not appling to a source longer than 250Kb. Option `maxSourceSizeToHighlight` is using to change max size of source to be syntax highlighted."'],
            demo: {
                view: 'source',
                data: {
                    content: codeExample,
                    syntax: 'js',
                    maxSourceSizeToHighlight: 4
                }
            }
        }
    ]
};
