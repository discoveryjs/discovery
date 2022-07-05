const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';

export default {
    demo: {
        view: 'source',
        data: { content: codeExample, syntax: 'js' }
    },
    examples: [
        {
            title: 'Supported syntaxes',
            beforeDemo: [
                'md:"Following values (for both `name` and `mime`) are supported for `syntax` option:"',
                {
                    view: 'table',
                    data: '#.options.syntaxes',
                    cols: {
                        name: { content: 'comma-list:name' },
                        mime: { content: 'comma-list:mime' }
                    }
                },
                'md:"More syntaxes may be added via `import \'codemirror/mode/[name]/[name]\';`"'
            ],
            source: false
        },
        {
            title: 'Custom line numbers',
            demo: {
                view: 'source',
                data: {
                    content: codeExample,
                    syntax: 'js',
                    lineNum: idx => idx + 5
                }
            }
        },
        {
            title: 'Without line numbers',
            demo: {
                view: 'source',
                data: {
                    content: codeExample,
                    syntax: 'js',
                    lineNum: false
                }
            }
        }
    ]
};
