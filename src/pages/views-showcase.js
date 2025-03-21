import { addModelViewsToContext, getUsageRenderConfig } from './views-showcase/view-usage-render.js';
import introWebRender from './views-showcase/intro-web-render-md.js';
import introTextRender from './views-showcase/intro-text-render-md.js';

const introCodeConfig = {
    view: 'switch',
    content: [
        { when: 'syntax="render:text"', content: {
            view: 'block',
            className: 'view-render',
            content: [
                {
                    view: 'block',
                    className: 'view-render__source',
                    content: 'source{ syntax: "discovery-view", source }'
                },
                {
                    view: 'block',
                    className: 'view-render__result',
                    data: data => ({
                        ...data,
                        config: {
                            view: data.syntax === 'render:text' ? 'text-render' : 'context',
                            content: Function('return ' + data.source)()
                        }
                    }),
                    content: 'render{ config }'
                    // content: { view: 'render', config: 'config' }
                }
            ]
        } },
        { content: 'source' }
    ]
};

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
                                href: '="".pageLink(#.page, #.params.render |? { render: $ })',
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
                            itemConfig: {
                                postRender(el, config, data) {
                                    el.dataset.name = data.name;
                                }
                            },
                            context: (_, context) => ({ ...context, selectedViewId: host.pageRef }),
                            data: `
                                .[name ~= #.filter]
                                .sort(name asc)
                                .({ ..., disabled: no options.usage, selected: name = #.selectedViewId })
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
                context(data, context) {
                    // FIXME: make it simpler
                    host.overridePageHashStateWithAnchor({
                        ref: data?.name,
                        anchor: host.pageRef === (data?.name || null) ? host.pageAnchor : null
                    });
                    host.cancelScheduledRender();

                    // FIXME: that's a hack
                    setTimeout(() => {
                        const contentEl = host.dom.root.querySelector('article > .view-block.sidebar > .view-content-filter > .content');
                        if (contentEl) {
                            contentEl.querySelector(':scope .view-menu-item.selected')?.classList?.remove('selected');
                            contentEl.querySelector(`:scope .view-menu-item[data-name=${CSS.escape(data?.name)}]`)?.classList?.add('selected');
                        }
                    }, 50);

                    return { ...context, id: host.pageRef };
                },
                content: [
                    { when: 'no $ and #.id', content: 'alert-warning:"View \\"" + #.id + "\\" not found"' },
                    { when: 'no $', content: [
                        'h1:#.render = "text" ? "Model\'s text views" : "Model\'s views"',
                        'alert:"← Select a view to get details"',
                        { view: 'markdown', when: '#.render = "web"', source: introWebRender, codeConfig: introCodeConfig },
                        { view: 'markdown', when: '#.render = "text"', source: introTextRender, codeConfig: introCodeConfig }
                    ] },
                    { content: [
                        getUsageRenderConfig(host)
                    ] }
                ]
            }
        }
    }, {
        sidebar: false
    });
}
