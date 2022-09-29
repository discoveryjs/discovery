const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';

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
            title: 'Highlight ranges',
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
        },
        {
            title: 'Max content size for highlight',
            beforeDemo: ['md:"By default a syntax highlighing is not appling to a source which is bigger than 250Kb. Option `maxSourceSizeToHighlight` is using to change max size of source to be highlighted."'],
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
