import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { jsonStringifyInfo } from '../../core/utils/json.js';
import copyText from '../../core/utils/copy-text.js';

function formatSize(size) {
    if (!size) {
        return '';
    }

    return ', ' + numDelim(size) + ' bytes';
}

export function createValueActionsPopup(host, elementData, buildPathForElement) {
    return new host.view.Popup({
        className: 'view-struct-actions-popup',
        render: (popupEl, triggerEl, hide) => {
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
                    const { minLength, circular } = jsonStringifyInfo(data);

                    compactSize = minLength;

                    if (circular.length) {
                        jsonCompactStringifyError = 'Converting circular structure to JSON';
                    } else if (compactSize > maxAllowedSize) {
                        jsonCompactStringifyError = 'Resulting JSON is over 1 Gb';
                    } else {
                        formattedSize = jsonStringifyInfo(data, null, 4).minLength;
                        if (formattedSize > maxAllowedSize) {
                            jsonFormattedStringifyError = 'Resulting JSON is over 1 Gb';
                        }
                    }
                } catch (e) {
                    jsonCompactStringifyError = /Maximum call stack size|too much recursion/i.test(e.message)
                        ? 'Too much nested structure'
                        : e.message;
                }

                if (jsonCompactStringifyError) {
                    jsonCompactStringifyError = 'Can\'t be copied: ' + jsonCompactStringifyError;

                    if (!jsonFormattedStringifyError) {
                        jsonFormattedStringifyError = jsonCompactStringifyError;
                    }
                }

                if (path) {
                    actions.push({
                        text: 'Copy path:',
                        notes: escapeHtml(path),
                        action: () => copyText(path)
                    });
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
                    notes: `(compact${jsonCompactStringifyError ? '' : formatSize(compactSize)})`,
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
