import { addModelViewsToContext, getUsageRenderConfig } from './views-showcase/view-usage-render.js';
import introWebRender from './views-showcase/intro-web-render-md.js';
import introTextRender from './views-showcase/intro-text-render-md.js';

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
        context: addModelViewsToContext(host),
        data: '#.views.selected',
        modifiers: [
            {
                view: 'block',
                className: 'sidebar',
                content: [
                    {
                        view: 'block',
                        className: 'sidebar-header',
                        content: [
                            {
                                view: 'link',
                                className: '="index-page-link" + (#.id ? " view-selected" : "")',
                                href: '="".pageLink(#.page)',
                                text: 'Intro'
                            },
                            {
                                view: 'context',
                                content: {
                                    view: 'toggle-group',
                                    className: 'render-toggle',
                                    beforeToggles: 'text:"Render:"',
                                    value: '=#.render',
                                    onChange(value) {
                                        host.setPageParams(value === 'text' ? { render: 'text' } : {});
                                    },
                                    data: [
                                        { value: 'web' },
                                        { value: 'text' }
                                    ]
                                }
                            }
                        ]
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
                        'h1:#.render = "text" ? "Model\'s text views" : "Model\'s views"',
                        'alert:"← Select a view to get details"',
                        { view: 'markdown', when: '#.render = "web"', source: introWebRender },
                        { view: 'markdown', when: '#.render = "text"', source: introTextRender }
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

                        getUsageRenderConfig(host)
                    ] }
                ]
            }
        }
    }, {
        sidebar: false
    });
}
