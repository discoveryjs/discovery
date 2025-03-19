const codeExample = 'let name = "world";\n\nconsole.log(`Hello, ${name}!`);';
const lineNum = Function('return num => num + 5')();

export default {
    demo: {
        view: 'source',
        syntax: 'js',
        source: codeExample
    },
    examples: [
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
            title: 'Marks',
            highlightProps: ['marks'],
            beforeDemo: { view: 'md', source: [
                'The `marks` option allows injecting text marks at specific points in the source text. The `marks` value must be an array of objects with the following fields:',
                '\n',
                '- `offset` (required) - the offset in the source where the mark is injected.',
                '- `content` - view config for content (e.g., `\'text:"hello"\'` or `{ view: \'name\', ... }`)',
                '- `prefix` - text to display before the content of mark',
                '- `postfix` - text to display after the content of mark'
            ] },
            demo: {
                view: 'source',
                source: 'let demo = "mark";\n\nif (expr) {\n  // do something\n}',
                syntax: 'js',
                marks: [
                    { offset: 4 },
                    { offset: 4, content: 'text:"mark"' },
                    { offset: 24, prefix: 'self: ', content: 'text:"123"', postfix: 'ms' }
                ]
            }
        }
    ]
};
