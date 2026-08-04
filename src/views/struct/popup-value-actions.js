import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { jsonStringifyInfo } from '../../core/utils/json.js';
import { copyText } from '../../core/utils/copy-text.js';

const MAX_JSON_COPY_SIZE = 12 * 1024 * 1024; // 512 Mb

function formatSize(size) {
    if (!size) {
        return '';
    }

    return `, ${numDelim(size)} bytes`;
}

function findRootData(context) {
    while (context.parent !== null) {
        context = context.parent;
    }

    return context.host[''];
}

function jsonCopyError(size, maxSize = MAX_JSON_COPY_SIZE) {
    const copyError = size > maxSize ? 'Resulting JSON is over 512 Mb' : null;

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
                let jsonStringifyError = false;
                let formattedSize = 0;
                let compactSize = 0;

                try {
                    const { bytes, spaceBytes, circular } = jsonStringifyInfo(data, { space: 4 });

                    if (circular.length) {
                        jsonStringifyError = 'Converting circular structure to JSON';
                    } else {
                        compactSize = bytes - spaceBytes;
                        formattedSize = bytes + 2;
                    }
                } catch (e) {
                    jsonStringifyError = /Maximum call stack size|too much recursion/i.test(e.message)
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

                const fomattedCopyError = jsonCopyError(formattedSize);
                const compactCopyError = jsonCopyError(compactSize);

                actions.push({
                    groupStart: !jsonStringifyError,
                    text: 'Copy as JSON',
                    notes: `(formatted${formatSize(formattedSize)})`,
                    error: fomattedCopyError,
                    disabled: Boolean(jsonStringifyError || fomattedCopyError),
                    action: () => copyText(JSON.stringify(data, null, 4)),
                    postRender(el) {
                        if (jsonStringifyError) {
                            const errorEl = document.createElement('div');
                            errorEl.className = 'error';
                            errorEl.textContent = `Can't export JSON: ${jsonStringifyError}`;
                            el.prepend(errorEl);
                        }
                    }
                });
                actions.push({
                    text: 'Copy as JSON',
                    notes: `(compact${formatSize(compactSize)})`,
                    error: compactCopyError,
                    disabled: Boolean(jsonStringifyError || compactCopyError),
                    action: () => copyText(JSON.stringify(data))
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
                            disabled: Boolean(jsonStringifyError),
                            action: () => lastOptions.action === 'download'
                                ? host.action.call('downloadDataAsFile', data)
                                : host.action.call('saveDataAsFile', data)
                        });
                    }
                }

                actions.push({
                    text: 'Export as ...',
                    when: '#.actions.showExportDataDialog',
                    disabled: Boolean(jsonStringifyError),
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
                    className: '=groupStart ? "group-start" : null',
                    postRender(el, config, data, context) {
                        if (data.postRender) {
                            data.postRender(el, config, data, context);
                        }
                    }
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
