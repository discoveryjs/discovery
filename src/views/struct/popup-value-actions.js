import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { jsonStringifyInfo } from '../../core/utils/json.js';
import copyText from '../../core/utils/copy-text.js';

function formatSize(size) {
    if (!size) {
        return '';
    }

    return ', ' + numDelim(size) + ' bytes';
}

function findRootData(context) {
    while (context.parent !== null) {
        context = context.parent;
    }

    return context.host[''];
}

export function createValueActionsPopup(host, elementData, elementContext, buildPathForElement) {
    return new host.view.Popup({
        className: 'view-struct-actions-popup',
        render(popupEl, triggerEl, hide) {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);
            let actions = [];

            if (typeof data === 'string') {
                actions = [
                    {
                        text: 'Copy as quoted string',
                        action: () => copyText(JSON.stringify(data))
                    },
                    {
                        text: 'Copy as unquoted string',
                        action: () => copyText(JSON.stringify(data).slice(1, -1))
                    },
                    {
                        text: 'Copy a value (unescaped)',
                        action: () => copyText(data)
                    }
                ];
            } else {
                const path = host.pathToQuery(buildPathForElement(el));
                const maxAllowedSize = 1024 * 1024 * 1024;
                let jsonFormattedStringifyError = false;
                let jsonCompactStringifyError = false;
                let compactSize = 0;
                let formattedSize = 0;

                try {
                    const { bytes, spaceBytes, circular } = jsonStringifyInfo(data, { space: 4 });

                    if (circular.length) {
                        jsonCompactStringifyError = 'Converting circular structure to JSON';
                    } else {
                        compactSize = bytes - spaceBytes;
                        formattedSize = bytes + 2;

                        if (compactSize > maxAllowedSize) {
                            jsonCompactStringifyError = 'Resulting JSON is over 1 Gb';
                        }

                        if (formattedSize > maxAllowedSize) {
                            jsonFormattedStringifyError = 'Resulting JSON is over 1 Gb';
                        }
                    }
                } catch (e) {
                    jsonCompactStringifyError = jsonFormattedStringifyError = /Maximum call stack size|too much recursion/i.test(e.message)
                        ? 'Too much nested structure'
                        : e.message;
                }

                if (jsonCompactStringifyError) {
                    jsonCompactStringifyError = 'Can\'t be copied: ' + jsonCompactStringifyError;
                }

                if (jsonFormattedStringifyError) {
                    jsonFormattedStringifyError = 'Can\'t be copied: ' + jsonFormattedStringifyError;
                }

                if (path) {
                    actions.push({
                        text: 'Copy path:',
                        notes: escapeHtml(path),
                        action: () => copyText(path)
                    });

                    const context = elementContext.get(el);
                    const rootData = findRootData(context);

                    if (host.action.has('queryAcceptChanges') && host.action.call('queryAcceptChanges', rootData)) {
                        host.action.has('querySubquery') && actions.push({
                            text: 'Create a subquery from the path',
                            action: () => host.action.call('querySubquery', path, rootData)
                        });
                        host.action.has('queryAppend') && actions.push({
                            text: 'Append path to current query',
                            action: () => host.action.call('queryAppend', path, rootData)
                        });
                    }
                }

                actions.push({
                    text: 'Copy as JSON',
                    notes: `(formatted${formatSize(formattedSize)})`,
                    error: jsonFormattedStringifyError,
                    disabled: Boolean(jsonFormattedStringifyError),
                    action: () => copyText(JSON.stringify(data, null, 4))
                });
                actions.push({
                    text: 'Copy as JSON',
                    notes: `(compact${formatSize(compactSize)})`,
                    error: jsonCompactStringifyError,
                    disabled: Boolean(jsonCompactStringifyError),
                    action: () => copyText(JSON.stringify(data))
                });
            }

            host.view.render(popupEl, {
                view: 'menu',
                onClick(item) {
                    hide();
                    item.action();
                },
                item: [
                    'html:text',
                    {
                        view: 'block',
                        when: 'notes',
                        className: 'notes',
                        content: 'html:notes'
                    },
                    {
                        view: 'block',
                        when: 'error',
                        className: 'error',
                        content: 'text:error'
                    }
                ]
            }, actions);
        }
    });
}
