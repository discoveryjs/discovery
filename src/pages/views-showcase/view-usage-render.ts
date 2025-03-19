/* eslint-env browser */
import { jsonStringifyAsJavaScript } from '../../core/utils/json.js';
import type { ViewModel } from '../../main/view-model.js';

function isTextNode(node) {
    return Boolean(node && node.nodeType === Node.TEXT_NODE);
}

function childrenHtml(node, level = '\n') {
    let res = '';

    for (const child of node.childNodes) {
        if (!isTextNode(child) && child.previousSibling && !isTextNode(child.previousSibling)) {
            res += level;
        }

        res += nodeHtml(child, level);
    }

    return res;
}

function nodeHtml(node: Node, level = '\n') {
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            const [start, end = ''] = (node.cloneNode() as HTMLElement).outerHTML.split(/(?=<\/[^>]+>$)/);
            return (
                start +
                (node.firstChild && !isTextNode(node.firstChild) ? level + '  ' : '') +
                childrenHtml(node, level + '  ') +
                (node.lastChild && !isTextNode(node.lastChild) ? level : '') +
                end
            );

        case Node.TEXT_NODE:
            return node.nodeValue;

        case Node.COMMENT_NODE:
            return '<!--' + node.nodeValue + '-->';

        case Node.DOCUMENT_FRAGMENT_NODE:
            return childrenHtml(node, level);
    }

    return '';
}

function highlightRefs(data: any, content: string) {
    const refs: { range: [number, number] }[] = [];
    const highlights = [...Array.isArray(data.highlight)
        ? data.highlight
        : data.highlight ? [data.highlight] : []
    ];

    if (Array.isArray(data.highlightProps)) {
        highlights.push(`(")?(?:${data.highlightProps.join('|')})\\1(?=:)`);
    }

    for (const highlight of highlights) {
        const rx = new RegExp(highlight, 'gm');
        let match: RegExpExecArray | null = null;

        while (match = rx.exec(content)) {
            refs.push({ range: [match.index, match.index + match[0].length] });
        }
    }

    return refs;
}

export const addModelViewsToContext = (host: ViewModel) => (_: any, context: any) => {
    const render = context.params?.render === 'text' ? 'text' : 'web';
    const webViews = [...host.view.values];
    const textViews = [...host.textView.values];

    return {
        ...context,
        render,
        views: {
            webViews,
            textViews,
            selected: render === 'text' ? textViews : webViews
        }
    };
};

export function getUsageRenderConfig(host: ViewModel) {
    const renderDemo = {
        view: 'context',
        modifiers: [
            {
                view: 'switch',
                when: 'beforeDemo',
                content: [
                    { when: ({ beforeDemo }) => typeof beforeDemo === 'string', content: 'html:"<p>" + beforeDemo + "</p>"' },
                    { content: {
                        view: 'render',
                        config: 'beforeDemo',
                        context: '{ __demoContext: true, ...(viewDef | { name, group, options }) }'
                    } }
                ]
            },
            {
                view: 'block',
                when: 'demo or view',
                className: 'usage-render',
                postRender(el: HTMLElement, { onInit }, { demoFixed }, ctx: any) {
                    if (demoFixed) {
                        el.classList.add('demo-fixed');
                        el.style.height = demoFixed + 'px';
                    }

                    el.dataset.renderType = ctx.render;

                    onInit(el, 'root');
                },
                content: {
                    view: 'render',
                    config: 'demo or view | #.render != "text" ?: [{ view: "text-render", content: $ }, { view: "text-render-tree", when: false, content: $ }]',
                    data: 'demoData',
                    context: '{ __demoContext: true, ...(viewDef | { name, group, options }) }'
                }
            },
            {
                view: 'switch',
                when: 'afterDemo',
                content: [
                    { when: ({ afterDemo }) => typeof afterDemo === 'string', content: 'html:"<p>" + afterDemo + "</p>"' },
                    { content: {
                        view: 'render',
                        config: 'afterDemo',
                        context: '{ __demoContext: true, ...(viewDef | { name, group, options }) }'
                    } }
                ]
            }
        ],
        content: {
            view: 'tabs',
            when: 'source != false',
            className: 'usage-sources',
            name: 'code',
            tabs: [
                { value: 'config', text: 'Config (JS)' },
                { value: 'config-json', text: 'Config (JSON)' },
                { value: 'html', text: 'Rendered HTML' }
            ],
            content: {
                view: 'switch',
                content: [
                    { when: '#.code="config"', content: [{
                        view: 'expand',
                        when: '"demoData" in $',
                        header: 'text:"Input data"',
                        content: {
                            view: 'struct',
                            expanded: 2,
                            data: 'demoData'
                        }
                    }, {
                        view: 'source',
                        className: 'first-tab',
                        data: (data) => {
                            const content = jsonStringifyAsJavaScript(data.demo || data.view);

                            return {
                                syntax: 'discovery-view',
                                content,
                                refs: highlightRefs(data, content)
                            };
                        }
                    }] },
                    { when: '#.code="config-json"', content: [{
                        view: 'expand',
                        when: '"demoData" in $',
                        header: 'text:"Input data"',
                        content: {
                            view: 'struct',
                            expanded: 2,
                            data: 'demoData'
                        }
                    }, {
                        view: 'source',
                        data: (data) => {
                            const content = JSON.stringify(data.demo || data.view, null, 4);

                            return {
                                syntax: 'json',
                                content,
                                refs: highlightRefs(data, content)
                            };
                        }
                    }] },
                    { when: '#.code="html"', content: {
                        view: 'source',
                        data: (data, context) => ({
                            syntax: 'html',
                            content: childrenHtml(context.root)
                        })
                    } }
                ]
            }
        }
    };

    return {
        view: 'block',
        className: 'discovery-view-usage',
        context: addModelViewsToContext(host),
        data({ name, options }, context) {
            const group = context.views.selected
                .filter(view => view.options.usage === options.usage)
                .map(view => view.name);

            if (!group.includes(name)) {
                group.unshift(name);
            }

            return context.viewDef = {
                demo: { view: name, data: '"' + name + '"' },
                ...typeof options.usage === 'function'
                    ? options.usage(name, group)
                    : Array.isArray(options.usage)
                        ? { examples: options.usage }
                        : options.usage,
                name,
                group,
                options
            };
        },
        content: [
            'h1:name',
            renderDemo,
            {
                view: 'list',
                data: 'examples',
                whenData: true,
                itemConfig: {
                    className: 'usage-section'
                },
                item: [
                    'h2{ anchor: true, data: title }',
                    renderDemo
                ]
            }
        ]
    };
}
