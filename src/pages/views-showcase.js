import renderUsage from '../views/_usage.js';

export default function(host) {
    // const fixture = () => ({
    //     views: Object.fromEntries(host.view.entries),
    //     pages: Object.fromEntries(host.page.entries)
    // });

    host.page.define('views-showcase', {
        view: 'context',
        data: () => [...host.view.values],
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
                        data: `
                            .[name ~= #.filter]
                            .sort(name asc)
                            .({ ..., disabled: no options.usage })
                        `,
                        item: 'text-match:{ text: name, match: #.filter }'
                    }
                }
            }
        ],
        content: {
            view: 'block',
            className: 'content',
            data: '$[=> name=(#.view.name or #.id)]',
            content: {
                view: 'switch',
                content: [
                    { when: 'no $ and #.id', content: 'alert-warning:"View \\"" + #.id + "\\" not found"' },
                    { when: 'no $', content: 'text:"Select a view"' },
                    { content: [
                        { view: 'context', postRender: function(el, config, data, context) {
                            // FIXME: make it simpler
                            host.setPageRef(data.name);
                            host.cancelScheduledRender();
                            context.id = host.pageRef;
                        } },

                        renderUsage(host)
                    ] }
                ]
            }
        }
    }, {
        sidebar: false
    });
}
