import type { ViewModel } from '../main/view-model.js';
import type { DownloadDataAsFileOptions, SaveAsFileOptions } from '../core/utils/index.js';
import { stringifyChunked } from '@discoveryjs/json-ext';
import { getReadableStreamFromSource } from '../core/utils/web-stream.js';
import { randomId } from '../core/utils/id.js';
import {
    downloadDataAsFile,
    saveStreamAsFile
} from '../core/utils/index.js';

// export an integration with default settings
export default Object.assign(setup(), { setup });
export type ExportDataOptions = {
    download: boolean;
    save: boolean;
}
export type ExportDataStreamOptions = {
    format?: 'json' | 'jsonl' | 'jsonxl';
    space?: string | number | null;
    compression?: 'gzip' | 'deflate' | null;
    highWaterMark?: number;
}

function setup(options?: Partial<ExportDataOptions>) {
    options = {
        download: true,
        save: true,
        ...options
    };

    return function(host: ViewModel) {
        const isDownloadEnabled = options.download && typeof downloadDataAsFile === 'function';
        const isSaveEnabled = options.save && typeof saveStreamAsFile === 'function';

        if (!isDownloadEnabled && !isSaveEnabled) {
            host.logger.debug(
                'Neither File System Access API nor download via anchor element is supported in this environment. ' +
                'Exporting data as file will not work.'
            );
            return;
        }

        if (host.dialog) {
            // setTimeout(() => host.dialog.show('test'), 1000);
            host.dialog.define('export-data-as', {
                titleText: 'Export Data',
                content: {
                    view: 'grid',
                    rows: [
                        [
                            'text:"Format:"',
                            {
                                view: 'toggle-group',
                                name: 'format',
                                data: [
                                    { value: 'json', text: 'JSON' },
                                    { value: 'jsonl', text: 'JSONL' },
                                    { value: 'jsonxl', text: 'JSONXL' }
                                ]
                            }
                        ],
                        [
                            'text:"Formatting:"',
                            {
                                view: 'toggle-group',
                                when: '#.format != "jsonxl"',
                                name: 'space',
                                data: [
                                    { value: null, text: 'None' },
                                    { value: 2, text: '2 spaces' },
                                    { value: 4, text: '4 spaces' },
                                    { value: '\t', text: 'Tab' }
                                ]
                            }
                        ],
                        [
                            'text:"Compression:"',
                            {
                                view: 'toggle-group',
                                name: 'compression',
                                data: [
                                    { value: null, text: 'None' },
                                    { value: 'gzip', text: 'Gzip' },
                                    { value: 'deflate', text: 'Deflate' }
                                ]
                            }
                        ]
                    ]
                },
                toolbar: [
                    // 'struct:#.dialogValue',
                    {
                        view: 'button-primary',
                        when: isSaveEnabled,
                        text: 'Save as...',
                        onClick: '==>#.dialog.submit.call("save")'
                    },
                    {
                        view: 'button',
                        when: isDownloadEnabled,
                        text: 'Download',
                        onClick: '==>#.dialog.submit.call("download")'
                    },
                    {
                        view: 'button',
                        text: 'Cancel',
                        onClick: '=#.dialog.close'
                    }
                ],
                onSubmit({ submitValue, returnValue, data }) {
                    const action =
                        submitValue === 'save'
                            ? 'saveDataAsFile'
                            : submitValue === 'download'
                                ? 'downloadDataAsFile'
                                : undefined;

                    if (!action || !host.action.has(action)) {
                        host.logger.error(`Action "${action}" is unknown or not available`);
                        return;
                    }

                    setTimeout(() => host.action.call(action, data, returnValue), 50);
                }
            });
        }

        if (isDownloadEnabled) {
            host.action.define('downloadDataAsFile', (data, options: DownloadDataAsFileOptions & ExportDataStreamOptions) => {
                options = options || { format: 'json' };

                const stream = createDataStream(data, options);
                const suggestedFilename = options?.filename || getSuggestedFilename(options);
                const onProgress = options?.onProgress ?? createOnProgressCallback(host);

                downloadDataAsFile?.(stream, {
                    filename: suggestedFilename,
                    onProgress: onProgress
                });
            });
        }

        if (isSaveEnabled) {
            host.action.define('saveDataAsFile', (data, options?: SaveAsFileOptions & ExportDataStreamOptions) => {
                options = options || { format: 'json' };

                const stream = createDataStream(data, options);
                const suggestedFilename = options?.filename || getSuggestedFilename(options);
                const onProgress = options?.onProgress ?? createOnProgressCallback(host);

                saveStreamAsFile?.(stream, {
                    filename: suggestedFilename,
                    onProgress: onProgress
                });
            });
        }
    };
}

function getSuggestedFilename(options?: ExportDataStreamOptions) {
    const { format, compression } = options || {};

    return `data.${format}${compression === 'gzip'
        ? '.gz'
        : compression === 'deflate'
            ? '.deflate'
            : ''
    }`;
}

function createDataStream(data: any, options?: ExportDataStreamOptions): ReadableStream {
    const {
        format,
        space,
        compression,
        highWaterMark = 1024 * 1024
    } = options || {};
    let source;

    switch (format) {
        case 'json':
            source = stringifyChunked(data, { mode: 'json', space, highWaterMark });
            break;

        case 'jsonl':
            source = stringifyChunked(data, { mode: 'jsonl', space, highWaterMark });
            break;

        default:
            throw new Error(`Unsupported format "${format}"`);
    }

    let stream = getReadableStreamFromSource(source);

    if (compression) {
        stream = stream.pipeThrough(new CompressionStream(compression));
    }

    return stream;
}

function createOnProgressCallback(host: ViewModel) {
    const actionId = randomId();
    const onProgress = async (progress: { filename: string; done: boolean; written: number }) => {
        const { filename, done, written } = progress;

        host.action.call('toastMessage', {
            id: actionId,
            type: !done ? 'primary' : 'success',
            data: { filename, done, written },
            content: !done
                ? [
                    'text-numeric:`Saving file ${filename} (${written / 1_000_000 | $ + "" | replace(/(\\.\\d).*/, "$1")} MB)...`',
                    'progress{ when: total, progress: completed / total }'
                ]
                : 'text:`File ${filename} saved`',
            remove: done ? 5000 : false
        });

        await new Promise(resolve => setTimeout(resolve, 10));
    };

    return onProgress;
}
