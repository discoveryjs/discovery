export default {
    demo: {
        view: 'markdown',
        source: '# Example\n\n> NOTE: That\'s an experimental view based on [marked](https://github.com/markedjs/marked)\n\nMarkdown is good because:\n* You\'ll get **formatted** *text* with _no tags_\n* It\'s much simpler than `HTML`\n\n```html\n<b>bold</b><i>italic</i>\n```\n[Read more](https://guides.github.com/features/mastering-markdown/)'
    },
    examples: [
        {
            title: 'Inline config',
            demo: 'markdown{ source: "**Hello** `world`!" }'
        },
        {
            title: 'Shortest example',
            beforeDemo: ['md:"You can use `md` alias for `markdown` with a string as data. That\'s a **shortest** definition for a marked text"'],
            demo: 'md:"**Hello** `world`!"'
        },
        {
            title: 'Disable anchors for headers',
            beforeDemo: 'Hover a header to see chain icon on left side when anchors are enabled',
            demo: [
                {
                    view: 'markdown',
                    anchors: false,
                    source: '## header with disabled anchor'
                },
                {
                    view: 'markdown',
                    source: '## header with default settings'
                }
            ]
        },
        {
            title: 'Showcase',
            demo: {
                view: 'markdown',
                source: `
# Header
## Header
### Header
#### Header
##### Header
* One
* Two
    * Three

4. Four
5. Five
    6. Six
- [ ] Task 1
- [x] Task 2

Paragraph **bold** __bold__ *italic* _italic_ ~line-through~ \`code\` [link](#href)
>Blockquote
> > Line 2

\`\`\`js
var some = "code";
\`\`\`

foo | bar
----|-----
1 | A
2 | C
3 | E
`
            }
        }
    ]
};
