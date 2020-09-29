/* eslint-env browser */
import { jsonStringifyAsJavaScript } from '../core/utils/json.js';

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

function nodeHtml(node, level = '\n') {
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            const [start, end = ''] = node.cloneNode().outerHTML.split(/(?=<\/[^>]+>$)/);
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
                        data: '$[=>name=#.view.name].($name; options.usage.({ $name, usage: $ }))',
                        content: [
                            'h1:#.view.name',
                            {
                                view: 'list',
                                item: [
                                    'h2:usage.title',
                                    {
                                        view: 'context',
                                        modifiers: {
                                            view: 'block',
                                            className: 'usage-render',
                                            postRender: (el, { onInit }) => onInit(el, 'root'),
                                            content: {
                                                view: 'render',
                                                config: 'usage.view',
                                                data: fixture,
                                                context: '{ view }'
                                            }
                                        },
                                        content: {
                                            view: 'tabs',
                                            className: 'usage-sources',
                                            name: 'code',
                                            tabs: [
                                                { value: 'config', text: 'Config (JS)' },
                                                { value: 'config-json', text: 'Config (JSON)' },
                                                { value: 'html', text: 'HTML' }
                                            ],
                                            content: {
                                                view: 'switch',
                                                content: [
                                                    { when: '#.code="config"', content: {
                                                        view: 'source',
                                                        className: 'first-tab',
                                                        data: (data) => ({
                                                            syntax: 'js',
                                                            content: jsonStringifyAsJavaScript(data.usage.view)
                                                        })
                                                    } },
                                                    { when: '#.code="config-json"', content: {
                                                        view: 'source',
                                                        data: (data) => ({
                                                            syntax: 'json',
                                                            content: JSON.stringify(data.usage.view, null, 4)
                                                        })
                                                    } },
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
