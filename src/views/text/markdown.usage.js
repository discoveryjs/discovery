export default {
    demo: {
        view: 'markdown',
        source: '# Markdown example\n\n> NOTE: The `markdown` view is based on [marked](https://github.com/markedjs/marked) package\n\nMarkdown is good because:\n* You\'ll get **formatted** *text* with _no tags_\n* It\'s much simpler than `HTML`\n\n```html\n<b>bold</b><i>italic</i>\n```\n[Read more](https://guides.github.com/features/mastering-markdown/)'
    },
    examples: [
        {
            title: 'Inline config',
            demo: 'markdown{ source: "**Hello** `world`!" }'
        },
        {
            title: 'Shorthand syntax',
            beforeDemo: ['md:"You can use `md` as an alias for `markdown` with a string as data. That\'s a **shortest** definition for a marked text"'],
            demo: 'md:"**Hello** `world`!"'
        },
        {
            title: 'Array of strings as a source',
            beforeDemo: ['md:"Array of strings might be passed as a value for `source` property which is useful for a long sources\\n> NOTE: This doesn\'t work a source passed via data"'],
            demo: {
                view: 'markdown',
                source: ['Array', 'of', '`strings`']
            }
        },
        {
            title: 'Interpolation',
            beforeDemo: ['md:"Interpolation can be used almost anywhere in a markdown to embed the result of a jora query into resulting HTML. Just place a jora query between `{{`{{`}}` and `{{`}`+`}`}}`:"'],
            demo: {
                view: 'md',
                source: [
                    'Simple evaluation: 2 + 2 = `{{ 2 + 2 }}`',
                    '',
                    'Markdown view has {{ #.options.usage.examples.size() }} examples'
                ]
            }
        },
        {
            title: 'Disable anchors for headers',
            highlightProps: ['anchors'],
            beforeDemo: 'Hover a header to see a chain icon on the left side of header when anchors are enabled:',
            demo: [
                {
                    view: 'markdown',
                    source: '## header with default settings'
                },
                {
                    view: 'markdown',
                    anchors: false,
                    source: '## header with disabled anchor'
                }
            ]
        },
        {
            title: 'Sections prelude and postlude',
            highlightProps: [
                'sectionPrelude',
                'sectionPostlude'
            ],
            demo: {
                view: 'markdown',
                source: 'Section without a header\n\n## Header level 2\n\nSection 1\n\n### Header level 3\n\nSection 2\n\n## Header level 2\n\nSection 3',
                sectionPrelude: 'struct:#.section',
                sectionPostlude: { view: 'link', href: '#top', text: 'Scroll to top ↑' }
            }
        },
        {
            title: 'Configuration for code blocks',
            highlightProps: ['codeConfig'],
            beforeDemo: ['md:"Use `codeConfig` to specify any settings for code blocks available for `source` view."'],
            demo: {
                view: 'markdown',
                source: '# Header 1\n\n```js\nconsole.log("Hello world")\n```\n\n## Header 2\n\ntext\n\n## Header 3\n\n\n\n```jora\nfoo.bar.baz\n```',
                codeConfig: {
                    prelude: {
                        view: 'block',
                        content: ['badge:syntax', 'text:"Length: " + #.sourceViewProps.source.size()']
                    },
                    postlude: 'struct:#.section',
                    actionButtons: [
                        {
                            view: 'button',
                            text: 'Say "Hello world"',
                            onClick: Function('return () => alert("Hello world!")')()
                        }
                    ]
                }
            }
        },
        {
            title: 'Showcase',
            demo: {
                view: 'markdown',
                source: `
# Header level 1
## Header level 2
### Header level 3
#### Header level 4
##### Header level 5
* One
* Two
    * Three

4. Four
5. Five
    6. Six
- [{{ true }}] Task 1
- [x] Task 2

Interpolation in text: 2 + 2 = \`{{ 2 + 2 }}\`, or in attribute: [link](#dummy-link/{{"exam" + "ple"}} "{{ "example" + " title" }}")

Paragraph **bold** __bold__ *italic* _italic_ ~line-through~ \`code\` [link](#href)

>Blockquote
> > Line 2

> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

\`\`\`js
var some = "code";
\`\`\`

foo | bar
----|-----
1 | A
2 | C
3 | E
`.trim().split(/\n/)
            }
        }
    ]
};
