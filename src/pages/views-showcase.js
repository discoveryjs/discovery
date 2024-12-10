import renderUsage from '../views/_usage.js';
import intro from './views-showcase-intro-md.js';

export default function(host) {
    // a hack to scroll to top when no anchor
    host.on('pageAnchorChange', (prev) => {
        if (host.pageId === 'views-showcase' && prev && !host.pageAnchor) {
            const contentEl = host.dom.content.querySelector('.page-views-showcase > .content');

            if (contentEl) {
                contentEl.scrollTop = 0;
            }
        }
    });

    host.page.define('views-showcase', {
        view: 'context',
        data: () => [...host.view.values],
        modifiers: [
            {
                view: 'block',
                className: 'sidebar',
                content: [
                    {
                        view: 'link',
                        className: 'index-page-link',
                        href: '="".pageLink(#.page)',
                        text: 'Index page'
                    },
                    {
                        view: 'content-filter',
                        content: {
                            view: 'menu',
                            name: 'view',
                            limit: false,
                            emptyText: 'Nothing matched',
                            item: 'text-match:{ text: name, match: #.filter }',
                            data: `
                                .[name ~= #.filter]
                                .sort(name asc)
                                .({ ..., disabled: no options.usage })
                            `
                        }
                    }
                ]
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
                    { when: 'no $', content: [
                        'h1:"Views showcase"',
                        'alert:"← Select a view to get details"',
                        { view: 'markdown', source: intro }
                    ] },
                    { content: [
                        { view: 'context', postRender(el, config, data, context) {
                            // FIXME: make it simpler
                            host.overridePageHashStateWithAnchor({
                                ref: data.name,
                                anchor: host.pageRef === data.name ? host.pageAnchor : null
                            });
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
