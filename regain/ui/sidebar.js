/* eslint-disable no-undef */
discovery.view.define('sidebar', {
    view: 'content-filter',
    content: {
        view: 'list',
        limit: 100,
        data: `
            files().({
                path,
                views: ast.exports().functions()
                .body.body.expression.[callee.property.name.[$="define"]].arguments.value
            }).group(<views>, <path>)
            .[no #.filter or key~=#.filter]
        `,
        item: {
            view: 'list',
            item: ['link:{ href: "#view:" + key, text: key or "[[ none ]]" }']
        }
    }
});
