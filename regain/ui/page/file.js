/* eslint-disable no-undef */
discovery.page.define(
    'file',
    {
        view: 'context',
        data: '..children.pick(<path=#.id>)',
        content: {
            view: 'switch',
            content: [
                {
                    when: 'no $',
                    content: 'alert-warning:"File not found: " + #.id'
                },
                {
                    content: [
                        'h1:"File: " + name',
                        "h3:'📚Views'",
                        {
                            view: 'comma-list',
                            emptyText: 'no views',
                            data: `
                                ast.exports().functions()
                                    .body.body.expression.[callee.property.name.[$="define"]].arguments.value
                            `,
                            item: 'link:{ href: "#view:" + $, text: $ }'
                        },
                        "h3:'📖 Source code'",
                        {
                            view: 'source',
                            data: '({ content: content, syntax: "javascript" })'
                        }
                    ]
                }
            ]
        }
    },
    {
        resolveLink: 'file'
    }
);
