import { stringifyChunked } from '@discoveryjs/json-ext';
import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { jsonStringifyInfo } from '../../core/utils/json.js';
import { copyText } from '../../core/utils/copy-text.js';

function formatSize(size) {
    if (!size) {
        return '';
    }

    return numDelim(size) + ' bytes';
}

function findRootData(context) {
    while (context.parent !== null) {
        context = context.parent;
    }

    return context.host[''];
}

function jsonCopyError(stringifyError, size, maxSize = 1024 * 1024 * 1024) {
    const copyError = stringifyError || (size > maxSize ? 'Resulting JSON is over 1 Gb' : null);

    return copyError ? 'Can\'t be copied: ' + copyError : false;
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
                let jsonFormattedStringifyError = false;
                let jsonCompactStringifyError = false;
                let formattedSize = 0;
                let compactSize = 0;
                let jsonlSize = 0;

                try {
                    const { bytes, spaceBytes, circular } = jsonStringifyInfo(data, { space: 4 });

                    if (circular.length) {
                        jsonFormattedStringifyError = 'Converting circular structure to JSON';
                        jsonCompactStringifyError = 'Converting circular structure to JSON';
                    } else {
                        compactSize = bytes - spaceBytes;
                        formattedSize = bytes + 2;
                        jsonlSize = bytes + 2 - 2 * Array.isArray(data);
                    }
                } catch (e) {
                    jsonCompactStringifyError = jsonFormattedStringifyError = /Maximum call stack size|too much recursion/i.test(e.message)
                        ? 'Too much nested structure'
                        : e.message;
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
                            groupStart: true,
                            text: 'Create a subquery from the path',
                            action: () => host.action.call('querySubquery', path, rootData)
                        });
                        host.action.has('queryAppend') && actions.push({
                            text: 'Append path to current query',
                            action: () => host.action.call('queryAppend', path, rootData)
                        });
                    }
                }

                const fomattedCopyError = jsonCopyError(jsonFormattedStringifyError, formattedSize);
                const compactCopyError = jsonCopyError(jsonCompactStringifyError, compactSize);
                const jsonlCopyError = jsonCopyError(jsonCompactStringifyError, jsonlSize);

                actions.push({
                    groupStart: true,
                    text: 'Copy as JSON',
                    notes: `(formatted, ${formatSize(formattedSize)})`,
                    error: fomattedCopyError,
                    disabled: Boolean(fomattedCopyError),
                    action: () => copyText(JSON.stringify(data, null, 4))
                });
                actions.push({
                    text: 'Copy as JSON',
                    notes: `(compact, ${formatSize(compactSize)})`,
                    error: compactCopyError,
                    disabled: Boolean(compactCopyError),
                    action: () => copyText(JSON.stringify(data))
                });
                actions.push({
                    text: 'Copy as JSONL',
                    notes: `(compact, ${formatSize(jsonlSize)})`,
                    error: jsonlCopyError,
                    disabled: Boolean(jsonlCopyError),
                    action: () => copyText([...stringifyChunked(data, { mode: 'jsonl' })].join(''))
                });

                if (host.action.has('getLastExportDataOptions')) {
                    const lastOptions = host.action.call('getLastExportDataOptions');

                    if (lastOptions?.action) {
                        const format = lastOptions.format?.toUpperCase?.();
                        actions.push({
                            text: lastOptions.action === 'download' ? `Download as ${format}` : `Save as ${format} ...`,
                            lastOptions,
                            notes: `(${
                                lastOptions.space
                                    ? `${lastOptions.space === '\t' ? 'tab' : lastOptions.space + ' spaces'} formatting`
                                    : 'compact'
                            }${
                                lastOptions.compression ? `, ${lastOptions.compression}` : ''
                            })`,
                            error: jsonCompactStringifyError,
                            disabled: Boolean(jsonCompactStringifyError),
                            action: () => lastOptions.action === 'download'
                                ? host.action.call('downloadDataAsFile', data)
                                : host.action.call('saveDataAsFile', data)
                        });
                    }
                }

                actions.push({
                    text: 'Export as ...',
                    when: '#.actions.showExportDataDialog',
                    error: jsonCompactStringifyError,
                    disabled: Boolean(jsonCompactStringifyError),
                    action: () => host.action.call('showExportDataDialog', data)
                });
            }

            host.view.render(popupEl, {
                view: 'menu',
                onClick(item) {
                    hide();
                    item.action();
                },
                itemConfig: {
                    className: '=groupStart ? "group-start" : null'
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
