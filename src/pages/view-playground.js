export default function(discovery) {
    const fixture = () => ({
        views: Object.fromEntries(discovery.view.entries),
        pages: Object.fromEntries(discovery.page.entries)
    });

    discovery.page.define('view-playground', {
        view: 'context',
        data: () => [...discovery.view.values],
        modifiers: [
            {
                view: 'block',
                className: 'sidebar',
                content: {
                    view: 'content-filter',
                    content: {
                        view: 'menu',
                        name: 'view',
                        limit: false,
                        data: '.[name ~= #.filter].sort(name asc).({ ..., disabled: no options.usage })',
                        item: 'text-match:{ text: name, match: #.filter }'
                    }
                }
            }
        ],
        content: {
            view: 'block',
            className: 'content',
            content: {
                view: 'switch',
                content: [
                    { when: 'no #.view.name', content: 'text:"Select a view"' },
                    { content: {
                        view: 'context',
                        data: '.pick(=>name=#.view.name).($name; options.usage.({ $name, usage: $ }))',
                        content: [
                            'h1:#.view.name',
                            {
                                view: 'list',
                                item: [
                                    'h2:usage.title',
                                    {
                                        view: 'source',
                                        data: (data) => ({
                                            syntax: 'json',
                                            content: JSON.stringify(data.usage.view, null, 4)
                                        })
                                    },
                                    {
                                        view: 'render',
                                        config: 'usage.view',
                                        data: fixture,
                                        context: '{ view }'
                                    }
                                ]
                            }
                        ]
                    } }
                ]
            }
        }
    });
}
