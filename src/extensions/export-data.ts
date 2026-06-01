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
export type OnProgressState = {
    mode: 'download' | 'save';
    filename: string;
    done: boolean;
    written: number;
    error?: Error;
};

function setup(options?: Partial<ExportDataOptions>) {
    options = {
        download: true,
        save: true,
        ...options
    };

    return function(host: ViewModel) {
        const storageKey = 'discoveryjs:export-data-options';
        const isDownloadEnabled = options.download && typeof downloadDataAsFile === 'function';
        const isSaveEnabled = options.save && typeof saveStreamAsFile === 'function';

        if (!isDownloadEnabled && !isSaveEnabled) {
            host.logger.debug(
                'Neither File System Access API nor download via anchor element is supported in this environment. ' +
                'Exporting data as file will not work.'
            );
            return;
        }

        // define storage entry for export options, so they can be remembered and easily changed by user
        host.storage.define(storageKey, {
            defaultValue: {
                action: null,
                format: 'json',
                space: null,
                compression: null
            }
        });

        // define dialog for export options when host supports dialogs
        if (host.dialog) {
            host.action.define('getLastExportDataOptions', () =>
                host.storage.getValue(storageKey)
            );
            host.action.define('showExportDataDialog', (data, options) =>
                host.dialog.show('export-data-as', data, options)
            );
            host.dialog.define('export-data-as', {
                titleText: 'Export Data',
                content: {
                    view: 'grid',
                    context: (_, ctx: any) => ({
                        ...host.storage.getValue(storageKey),
                        ...ctx
                    }),
                    rows: [
                        [
                            'text:"Format:"',
                            {
                                view: 'toggle-group',
                                name: 'format',
                                data: [
                                    { value: 'json', text: 'JSON' },
                                    { value: 'jsonl', text: 'JSONL' }
                                    // { value: 'jsonxl', text: 'JSONXL' }
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
                onSubmit({ submitValue, returnValue, data }: {
                    submitValue: 'save' | 'download';
                    returnValue: ExportDataStreamOptions;
                    data: any;
                }) {
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

                    host.storage.setValue(storageKey, {
                        action: submitValue,
                        ...returnValue
                    });

                    host.action.call(action, data, returnValue);
                }
            });
        }

        // define actions for downloading and saving data as file
        if (isDownloadEnabled && downloadDataAsFile) {
            host.action.define('downloadDataAsFile', createActionHandler(host, downloadDataAsFile));
        }

        if (isSaveEnabled && saveStreamAsFile) {
            host.action.define('saveDataAsFile', createActionHandler(host, saveStreamAsFile));
        }
    };
}

function createActionHandler(host: ViewModel, handler: Exclude<typeof downloadDataAsFile | typeof saveStreamAsFile, null>) {
    return (data: unknown, options?: (DownloadDataAsFileOptions | SaveAsFileOptions) & ExportDataStreamOptions) => {
        options = options || { format: 'json' };

        const stream = createDataStream(data, options);
        const filename = options?.filename || getSuggestedFilename(options);
        const onProgress = createOnProgressCallback(host, handler === downloadDataAsFile ? 'download' : 'save', options?.onProgress);

        // don't return a promise here, to avoid blocking action until the file is saved
        handler(stream, {
            filename,
            onProgress
        }).catch((error: any) => {
            host.logger.error(`Failed to export data in ${filename}\n`, error);
            onProgress({
                filename,
                done: true,
                written: 0,
                error
            } as Parameters<ReturnType<typeof createOnProgressCallback>>[0]);
        });
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
    let source: Generator<string>;

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

    let stream = (getReadableStreamFromSource(source) as unknown as ReadableStream<string>)
        .pipeThrough(new TextEncoderStream());

    if (compression) {
        stream = stream.pipeThrough(new CompressionStream(compression));
    }

    return stream;
}

function createOnProgressCallback(host: ViewModel, mode: 'download' | 'save', customCallback?: (progress: OnProgressState) => void) {
    const actionId = randomId();
    const onProgress = customCallback || (async (progress: OnProgressState) => {
        const { mode, filename, done, written, error } = progress;

        host.action.call('toastMessage', {
            id: actionId,
            data: {
                mode,
                filename,
                done,
                written,
                error
            },
            ...error ? {
                type: 'danger',
                content: 'text:`Error exporting data ${filename}: ${error}`',
                remove: 10000
            } : !done ? {
                type: 'primary',
                content: [
                    'text-numeric:`${mode = "download" ? "Preparing payload for" : "Saving data into"} ${filename} (${written / 1_000_000 | $ + "" | replace(/(\\.\\d).*/, "$1")} MB)...`',
                    'progress{ when: total, progress: completed / total }'
                ],
                remove: false
            } : {
                type: 'success',
                content: 'text:`File ${filename} ${mode = "download" ? "prepared, download started" : "saved successfully"} (${written / 1_000_000 | $ + "" | replace(/(\\.\\d).*/, "$1")} MB)`',
                remove: 5000
            }
        });
        await new Promise(resolve => setTimeout(resolve, 1));
    });

    return (progress: Exclude<OnProgressState, 'mode'>) =>
        onProgress({ ...progress, mode });
}
