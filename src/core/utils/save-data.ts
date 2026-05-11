import { CreateBlobAsyncOptions, createBlobFromAsyncIterable } from './blob';
import { getIterableFromStream } from './web-stream';
import { combineChunks } from './load-data-streams';

const { showSaveFilePicker, document } = globalThis as (typeof globalThis & {
    showSaveFilePicker?(options: any): Promise<FileSystemFileHandle>;
});

export const isSaveFilePickerSupported = typeof showSaveFilePicker === 'function';
export const isDownloadSupported = typeof document !== 'undefined' && typeof document.createElement === 'function';
export type SaveAsFileOptions = {
    filename?: string;
    type?: string;
    onProgress?(progress: {
        filename: string;
        done: boolean;
        written: number;
    }): Promise<void> | void;
};
export type DownloadDataAsFileOptions = CreateBlobAsyncOptions & {
    filename?: string;
    onProgress?(progress: {
        filename: string;
        done: boolean;
        written: number;
    }): Promise<void> | void;
};

function getFilename(options?: { filename?: string, type?: string }) {
    const { filename, type } = options || {};

    if (typeof filename === 'string') {
        return filename;
    }

    if (typeof type === 'string' && /^application\/json(l|xl)?$/i.test(type)) {
        const extension = type.split('/').pop();

        if (extension) {
            return `data.${extension}`;
        }
    }

    return 'data';
}

export const saveStreamAsFile = isSaveFilePickerSupported
    ? async function(stream: ReadableStream<Uint8Array | string>, options?: SaveAsFileOptions & { filename?: string }) {
        const { onProgress } = options || {};
        const suggestedName = getFilename(options);
        const handler: FileSystemFileHandle = await showSaveFilePicker!({
            id: 'discovery',
            suggestedName
        });
        const writableStream = await handler.createWritable();
        const baseProgress = {
            filename: handler.name,
            done: false,
            written: 0
        };

        try {
            await onProgress?.(baseProgress);

            // When JSON is loaded via the network, it can be split into small chunks;
            // writing into a stream in small chunks can be very slow.
            // Use a buffer to ensure that the chunk size is at least 1MB.
            let buffer: string[] | Uint8Array[] = [];
            let bufferSize = 0;
            let written = 0;
            const FLUSH_BUFFER_SIZE = 1_000_000; // 1MB
            const flushBuffer = async () => {
                await writableStream.write(
                    typeof buffer[0] === 'string'
                        ? ''.concat(...buffer as string[])
                        : combineChunks(buffer as Uint8Array[], bufferSize)!
                );
                await onProgress?.({
                    ...baseProgress,
                    written: written += bufferSize
                });
                buffer = [];
                bufferSize = 0;
            };

            for await (const chunk of getIterableFromStream(stream)) {
                buffer.push(chunk as any);
                bufferSize += chunk.length;

                if (bufferSize >= FLUSH_BUFFER_SIZE) {
                    await flushBuffer();
                }
            }

            if (bufferSize > 0) {
                await flushBuffer();
            }

            await onProgress?.({ ...baseProgress, done: true, written });
        } finally {
            await writableStream.close();
        }
    }
    : null;

export const downloadDataAsFile = isDownloadSupported
    ? async (data: any, options?: DownloadDataAsFileOptions) => {
        const filename = getFilename(options);
        const blob = await createBlobFromAsyncIterable(data, {
            ...options,
            onProgress: (progress) => options?.onProgress?.({
                ...progress,
                filename
            })
        });

        if (blob === null) {
            throw new Error('Failed to create a file from the provided data');
        }

        const link = document.body.appendChild(document.createElement('a'));

        try {
            link.download = filename;
            link.href = URL.createObjectURL(blob);
            link.click();
        } finally {
            link.remove();
            URL.revokeObjectURL(link.href);
        }
    }
    : null;
