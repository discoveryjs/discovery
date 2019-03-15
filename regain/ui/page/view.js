/* eslint-disable no-undef */
discovery.page.define(
    'view',
    {
        view: 'context',
        data: `
            files().({
                path,
                ast,
                content,
                views: ast.exports().functions()
                .body.body.expression.[callee.property.name.[$="define"]].arguments.value
            }).group(<views>).pick(<(key=#.id)>).value.pick(0)
        `,
        content: {
            view: 'switch',
            content: [
                {
                    when: 'no $',
                    content: 'alert-warning:"View not found: " + #.id'
                },
                {
                    content: [
                        'h1:"View: " + #.id',
                        "h3:'🔗File'",
                        'link:{ href: "#file:" + path, text: path }',
                        "h3:'📝Properties'",
                        {
                            view: 'list',
                            emptyText: 'no properties',
                            data: `
                                (ast.exports().functions().body.body.expression.arguments.body.body.declarations.[init.name="config"].id.properties().name() +
                                ast.exports().functions().body.body.body.body.declarations.[init.name="config"].id.properties().name())
                                .[not $~=/^on./]
                            `,
                            item: 'text:$'
                        },
                        "h3:'⚡️Events'",
                        {
                            view: 'list',
                            emptyText: 'no events',
                            data: `
                                (ast.exports().functions().body.body.expression.arguments.body.body.declarations.[init.name="config"].id.properties().name() +
                                ast.exports().functions().body.body.body.body.declarations.[init.name="config"].id.properties().name())
                                .[$~=/^on./]
                            `,
                            item: 'text:$'
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
