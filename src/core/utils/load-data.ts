import type { Progressbar } from './progressbar.js';
import type {
    Encoding,
    LoadDataRequest,
    LoadDataRequestResult,
    LoadDataResourceMetadata,
    LoadDataResourceSource,
    Dataset,
    LoadDataState,
    LoadDataResult,
    LoadDataBaseOptions,
    LoadDataFetchOptions,
    ExtractResourceOptions,
    LoadDataStateProgress,
    DatasetResource
} from './load-data.types.js';
import { Observer } from '../observer.js';
import { normalizeEncodings } from '../encodings/utils.js';
import * as buildinEncodings from '../encodings/index.js';

export type * from './load-data.types.js';
export const dataSource = {
    stream: loadDataFromStream,
    event: loadDataFromEvent,
    file: loadDataFromFile,
    url: loadDataFromUrl,
    push: loadDataFromPush
};

function isSameOrigin(url: string) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch {
        return false;
    }
}

function defaultFetchOk(response: Response) {
    return response.ok;
}

function defaultFetchContentEncodedSize(response: Response) {
    return (
        response.headers.get('x-file-encoded-size') ||
        response.headers.get('content-length')
    );
}

function defaultFetchContentSize(response: Response) {
    return (
        response.headers.get('x-file-size') ||
        (isSameOrigin(response.url) && !response.headers.get('content-encoding')
            ? response.headers.get('content-length')
            : undefined)
    );
}

function defaultFetchContentCreatedAt(response: Response) {
    return (
        response.headers.get('x-file-created-at') ||
        response.headers.get('last-modified') ||
        undefined
    );
}

// FIXME: That's a temporary solution to make data loading work with a data wrapper
// used in old versions of @discoveryjs/cli
function isDiscoveryCliLegacyDataWrapper(input: any) {
    const keys = input ? Object.keys(input) : [];
    const expectedKeys = ['name', 'createdAt', 'elapsedTime', 'data'];

    if (keys.length !== 4 || keys.some(key => !expectedKeys.includes(key))) {
        return false;
    }

    return true;
}

function buildDataset(
    rawData: any,
    rawResource: LoadDataResourceMetadata | undefined,
    { size, encoding }: { size?: number, encoding: string }
) {
    let rawMeta: Record<string, unknown> | null = null;

    if (isDiscoveryCliLegacyDataWrapper(rawData)) {
        const { data, ...rawDataMeta } = rawData;

        rawData = data;
        rawResource = { ...rawResource, createdAt: data.createdAt };
        rawMeta = rawDataMeta;
    }

    const data = rawData;
    const meta = rawMeta || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, name, encoding: ignore1, size: ignore2, encodedSize, createdAt, ...restResource } = rawResource || {};
    const resource: DatasetResource = {
        type: type || 'unknown',
        name: name || 'unknown',
        encoding,
        ...Number.isFinite(size) ? { size } : null,
        ...Number.isFinite(encodedSize) ? { encodedSize } : null,
        createdAt: new Date((typeof createdAt === 'string' ? Date.parse(createdAt) : createdAt) || Date.now()),
        ...(restResource as Omit<{ [key: string]: unknown }, keyof DatasetResource>)
    };

    return {
        resource,
        meta,
        data
    };
}

async function consumeChunksAsSingleTypedArray(iterator: AsyncIterableIterator<Uint8Array>) {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    // Consume chunks
    for await (const chunk of iterator) {
        chunks.push(chunk);
        totalLength += chunk.byteLength;
    }

    // Create a new TypedArray with the combined length
    const combinedChunks = new Uint8Array(totalLength);

    // Iterate through the input arrays and set their values in the combinedChunks array
    let offset = 0;
    for (const array of chunks) {
        combinedChunks.set(array, offset);
        offset += array.length;
    }

    return combinedChunks;
}

export async function dataFromStream(
    stream: ReadableStream<Uint8Array>,
    extraEncodings: Encoding[] | undefined,
    totalSize: number | undefined,
    setStageProgress: (
        stage: 'receiving' | 'decoding',
        progress?: LoadDataStateProgress,
        step?: string
    ) => Promise<boolean>
) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const reader = stream.getReader();
    const streamStartTime = Date.now();
    const encodings = [
        ...normalizeEncodings(extraEncodings),
        buildinEncodings.jsonxl,
        buildinEncodings.json
    ];
    let decodingTime = 0;
    let encoding = 'unknown';
    let size = 0;

    await setStageProgress('receiving', getProgress(false));

    try {
        const firstChunk = await reader.read();
        const { value, done } = firstChunk;

        if (done) {
            throw new Error('Empty payload');
        }

        for (const { name, test, streaming, decode } of encodings) {
            if (test(value)) {
                encoding = name;

                const decodeRequest = streaming
                    ? decode(streamConsumer(firstChunk))
                    : consumeChunksAsSingleTypedArray(streamConsumer(firstChunk)).then(measureDecodingTime(decode));
                const data = await decodeRequest;

                return { data, encoding, size, decodingTime };
            }
        }

        throw new Error('No matched encoding found for the payload');
    } finally {
        reader.releaseLock();
    }

    function getProgress(done: boolean): LoadDataStateProgress {
        return {
            done,
            elapsed: Date.now() - streamStartTime,
            units: 'bytes',
            completed: size,
            total: totalSize
        };
    }

    async function* streamConsumer(firstChunk?: ReadableStreamReadResult<Uint8Array>) {
        while (true) {
            const { value, done } = firstChunk || await reader.read();

            firstChunk = undefined;

            if (done) {
                break;
            }

            for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
                const chunkDecodingStartTime = performance.now();
                const chunk = offset === 0 && value.length - offset < CHUNK_SIZE
                    ? value
                    : value.slice(offset, offset + CHUNK_SIZE);

                yield chunk;

                decodingTime += performance.now() - chunkDecodingStartTime;
                size += chunk.length;

                await setStageProgress('receiving', getProgress(false));
            }
        }

        // progress done
        await setStageProgress('receiving', getProgress(true));
    }

    function measureDecodingTime(decode: (payload: Uint8Array) => any) {
        return async (payload: Uint8Array) => {
            await setStageProgress('decoding', undefined, encoding);

            const startDecodingTime = performance.now();

            try {
                return await decode(payload);
            } finally {
                decodingTime = performance.now() - startDecodingTime;
            }
        };
    }
}

async function loadDataFromStreamInternal(
    request: LoadDataRequest,
    loadDataStateTracker: Observer<LoadDataState>
): Promise<Dataset> {
    try {
        await loadDataStateTracker.asyncSet({ stage: 'request' });
        const requestStart = new Date();
        const {
            method,
            stream,
            resource: rawResource,
            options,
            data: explicitData
        } = await request();

        const responseStart = new Date();
        const payloadSize = rawResource?.size;
        const { encodings } = options || {};
        const {
            data: rawData,
            encoding = 'unknown',
            size = undefined,
            decodingTime = 0
        } = explicitData ? { data: explicitData } : await dataFromStream(
            stream,
            encodings,
            Number(payloadSize) || 0,
            (stage, progress, step) => loadDataStateTracker.asyncSet({ stage, progress, step })
        );

        await loadDataStateTracker.asyncSet({ stage: 'received' });

        const { data, resource, meta } = buildDataset(rawData, rawResource, { size, encoding });
        const finishedTime = new Date();
        const time = Number(finishedTime) - Number(requestStart);
        const roundedDecodingTime = Math.round(decodingTime || 0);

        return {
            loadMethod: method,
            resource,
            meta,
            data,
            timings: {
                time,
                start: requestStart,
                end: finishedTime,
                loadingTime: time - roundedDecodingTime,
                decodingTime: roundedDecodingTime,
                requestTime: Number(responseStart) - Number(requestStart),
                requestStart,
                requestEnd: responseStart,
                responseTime: Number(finishedTime) - Number(responseStart),
                responseStart,
                responseEnd: finishedTime
            }
        };
    } catch (error) {
        console.error('[Discovery] Error loading data:', error);
        await loadDataStateTracker.asyncSet({ stage: 'error', error });
        throw error;
    }
}

export function createLoadDataState<T extends Record<string, unknown>>(
    datasetFactory: (state: Observer<LoadDataState>) => Promise<Dataset>,
    extra?: T
): LoadDataResult & T {
    const state = new Observer<LoadDataState>({ stage: 'inited' });

    return {
        state,
        // encapsulate logic into separate function since it's async,
        // but we need to return observer for progress tracking purposes
        dataset: datasetFactory(state),
        ...(extra as any)
    };
}

export function createDatasetFactoryFromStreamRequest(request: LoadDataRequest) {
    return (state: Observer<LoadDataState>) => loadDataFromStreamInternal(request, state);
}

export function loadDataFromStream(stream: ReadableStream, options?: LoadDataBaseOptions) {
    return createLoadDataState(
        createDatasetFactoryFromStreamRequest(() => ({
            method: 'stream',
            stream,
            resource: options?.resource,
            options
        }))
    );
}

export function loadDataFromFile(file: File, options?: LoadDataBaseOptions) {
    const resource = extractResourceMetadata(file);

    return createLoadDataState(
        createDatasetFactoryFromStreamRequest(() => ({
            method: 'file',
            stream: file.stream(),
            resource: options?.resource || resource, // options.resource takes precedence over an extracted resource
            options
        })),
        { title: 'Load data from file: ' + (resource?.name || 'unknown') }
    );
}

export function loadDataFromEvent(event: DragEvent | ClipboardEvent | InputEvent, options?: LoadDataBaseOptions) {
    const source =
        (event as DragEvent).dataTransfer ||
        (event as ClipboardEvent).clipboardData ||
        (event.target as HTMLInputElement | null);
    const file = source?.files?.[0];

    event.stopPropagation();
    event.preventDefault();

    if (!file) {
        throw new Error('Can\'t extract a file from an event object');
    }

    return loadDataFromFile(file, options);
}

export function loadDataFromUrl(url: string, options?: LoadDataFetchOptions) {
    options = options || {};

    return createLoadDataState(
        createDatasetFactoryFromStreamRequest(async () => {
            const response = await fetch(url, options.fetch);
            const resource = extractResourceMetadata(response, options);

            if (resource && response.body) {
                return {
                    method: 'fetch',
                    stream: response.body,
                    resource: options.resource || resource, // options.resource takes precedence over an extracted resource
                    options
                };
            }

            const contentType = response.headers.get('content-type') || '';
            let error: any = await response.text();

            if (contentType.toLowerCase().startsWith('application/json')) {
                try {
                    const json = JSON.parse(error);
                    error = json.error || json;
                } catch {}
            }

            error = new Error(error);
            error.isFetchError = true;
            error.status = response.status;
            error.statusText = response.statusText;
            error.stack = null;
            throw error;
        }),
        { title: `Load data from url: ${url}` }
    );
}

export function loadDataFromPush(options?: LoadDataBaseOptions) {
    let controller: ReadableStreamDefaultController | null;
    const stream = new ReadableStream({
        start(controller_) {
            controller = controller_;
        },
        cancel() {
            controller = null;
        }
    });

    let resolveRequest: (resource?: LoadDataResourceMetadata) => void;
    let pushResource: LoadDataResourceMetadata | null = null;
    const request = new Promise<LoadDataRequestResult>((resolve) => {
        resolveRequest = resource => resolve({
            method: 'push',
            stream,
            resource: resource ? (pushResource = resource) : options?.resource, // resource takes precedence over options.resource
            options
        });
    });

    options = options || {};

    return createLoadDataState(
        createDatasetFactoryFromStreamRequest(() => request),
        {
            start(resource: LoadDataResourceMetadata) {
                resolveRequest(resource);
            },
            push(chunk: Uint8Array) {
                resolveRequest();
                controller?.enqueue(chunk);
            },
            // error(error) {
            //     rejectRequest(error);
            // },
            finish(encodedSize?: number) {
                controller?.close();
                controller = null;

                if (encodedSize !== undefined && isFinite(encodedSize) && pushResource !== null) {
                    pushResource.encodedSize = Number(encodedSize);
                }

                pushResource = null;
            }
        }
    );
}

export function syncLoaderWithProgressbar({ dataset, state }: LoadDataResult, progressbar: Progressbar) {
    return new Promise<Dataset>((resolve, reject) =>
        state.subscribeSync(async (loadDataState, unsubscribe) => {
            if (loadDataState.stage === 'error') {
                unsubscribe();
                reject(loadDataState.error);
                return;
            }

            const { stage, progress, step } = loadDataState;

            await progressbar.setState({ stage, progress }, step);

            if (stage === 'received') {
                unsubscribe();
                resolve(dataset);
            }
        })
    );
}

export function extractResourceMetadata(
    source: LoadDataResourceSource,
    options?: ExtractResourceOptions
): LoadDataResourceMetadata | undefined {
    if (source instanceof Response) {
        const isResponseOk = options?.isResponseOk || defaultFetchOk;
        const getContentSize = options?.getContentSize || defaultFetchContentSize;
        const getContentEncodedSize = options?.getContentEncodedSize || defaultFetchContentEncodedSize;
        const getContentCreatedAt = options?.getContentCreatedAt || defaultFetchContentCreatedAt;

        if (isResponseOk(source)) {
            return {
                type: 'url',
                name: source.url,
                size: Number(getContentSize(source)) || null,
                encodedSize: Number(getContentEncodedSize(source)),
                createdAt: getContentCreatedAt(source)
            };
        }
    }

    if (source instanceof File) {
        return {
            type: 'file',
            name: source.name,
            size: source.size,
            createdAt: source.lastModified
        };
    }

    if (source instanceof Blob) {
        return {
            size: source.size
        };
    }

    if (ArrayBuffer.isView(source)) {
        return {
            size: source.byteLength
        };
    }

    if (typeof source === 'string') {
        return {
            size: source.length
        };
    }
}

export function convertToBlobIfPossible(source: any) {
    let blobParts = source;

    if (typeof blobParts === 'string' ||
        ArrayBuffer.isView(blobParts) ||
        blobParts instanceof ArrayBuffer ||
        (blobParts &&
            Symbol.iterator in blobParts === false &&
            Symbol.asyncIterator in blobParts === false)
    ) {
        blobParts = [blobParts];
    }

    // when blobParts iterable then it suitable to be used as source for a Blob
    if (blobParts && Symbol.iterator in blobParts) {
        return new Blob(blobParts as BlobPart[]);
    }

    // source is not iterable
    return source;
}

export function getReadableStreamFromSource(source: any) {
    if (source instanceof ReadableStream) {
        return source;
    }

    if (source instanceof Response) {
        if (source.body === null) {
            throw new Error('Response has no body');
        }

        return source.body;
    }

    source = convertToBlobIfPossible(source);

    if (source instanceof Blob) {
        return source.stream();
    }

    return new ReadableStream({
        start() {
            const generator = source
                ? source[Symbol.asyncIterator]
                : undefined;

            if (!generator) {
                throw new Error('Bad value type (can\'t convert to a stream)');
            }

            this.iterator = generator();
        },
        async pull(controller) {
            const { value, done } = await this.iterator.next();

            if (done) {
                this.iterator = null;
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
        cancel() {
            this.iterator = null;
        }
    });
}
