import { Observer } from '../observer.js';
import { streamFromBlob } from './stream-from-blob.js';
import { normalizeEncodings } from '../encodings/utils.js';
import * as buildinEncodings from '../encodings/index.js';
import type {
    Encoding,
    LoadDataOptions,
    LoadDataRequest,
    LoadDataRequestResult,
    LoadDataResourceMetadata,
    LoadDataResourceSource,
    Dataset,
    LoadDataSource,
    LoadDataState,
    SetProgressCallack
} from './load-data.types.js';

export const dataSource = {
    stream: loadDataFromStream,
    event: loadDataFromEvent,
    file: loadDataFromFile,
    url: loadDataFromUrl,
    push: loadDataFromPush
};

function isObject(value: unknown) {
    return value !== null && typeof value === 'object';
}

function isSameOrigin(url: string) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
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

function buildDataset(rawData: any, rawResource, { encoding, size }) {
    let rawMeta = null;

    if (isDiscoveryCliLegacyDataWrapper(rawData)) {
        const { data, ...rawDataMeta } = rawData;

        rawData = data;
        rawResource = { ...rawResource, createdAt: data.createdAt };
        rawMeta = rawDataMeta;
    }

    const data = rawData;
    const meta = rawMeta || {};
    // eslint-disable-next-line no-unused-vars
    const { type, name, encoding: ignore1, size: ignore2, encodedSize, createdAt, ...restResource } = rawResource;
    const resource = {
        type: type || 'unknown',
        name: name || 'unknown',
        encoding,
        size,
        ...encodedSize ? { encodedSize } : null,
        createdAt: new Date(Date.parse(createdAt) || Date.now()),
        ...restResource
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
    setProgress: SetProgressCallack
) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const reader = stream.getReader();
    const streamStartTime = Date.now();
    const encodings = [
        ...normalizeEncodings(extraEncodings),
        buildinEncodings.jsonxl,
        buildinEncodings.json
    ];
    let encoding = 'unknown';
    let size = 0;

    const streamConsumer = async function*(firstChunk) {
        while (true) {
            const { value, done } = firstChunk || await reader.read();

            firstChunk = undefined;

            if (done) {
                await setProgress({
                    done: true,
                    elapsed: Date.now() - streamStartTime,
                    units: 'bytes',
                    completed: size,
                    total: totalSize
                });
                break;
            }

            for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
                const chunk = offset === 0 && value.length - offset < CHUNK_SIZE
                    ? value
                    : value.slice(offset, offset + CHUNK_SIZE);

                size += chunk.length;
                yield chunk;

                await setProgress({
                    done: false,
                    elapsed: Date.now() - streamStartTime,
                    units: 'bytes',
                    completed: size,
                    total: totalSize
                });
            }
        }
    };

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
                    : consumeChunksAsSingleTypedArray(streamConsumer(firstChunk)).then(decode);
                const data = await decodeRequest;

                return { data, encoding, size };
            }
        }

        throw new Error('No matched encoding found for the payload');
    } finally {
        reader.releaseLock();
    }
}

async function loadDataFromStreamInternal(
    request: LoadDataRequest,
    progress: Observer<LoadDataState>
): Promise<Dataset> {
    const stage = async <T>(stage: 'request' | 'receive', fn: () => T): Promise<T> => {
        await progress.asyncSet({ stage });
        return await fn();
    };

    try {
        const requestStart = new Date();
        const {
            method,
            stream,
            resource: rawResource,
            options,
            data: explicitData
        } = await stage('request', request);

        const responseStart = new Date();
        const payloadSize = rawResource?.size;
        const { encodings } = options || {};
        const { data: rawData, encoding = 'unknown', size = undefined } = explicitData ? { data: explicitData } : await stage('receive', () =>
            dataFromStream(stream, encodings, Number(payloadSize) || 0, state => progress.asyncSet({
                stage: 'receive',
                progress: state
            }))
        );

        await progress.asyncSet({ stage: 'received' });

        const { data, resource, meta } = buildDataset(rawData, rawResource, { size, encoding });
        const finishedTime = new Date();

        return {
            loadMethod: method,
            resource,
            meta,
            data,
            timing: {
                time: Number(finishedTime) - Number(requestStart),
                start: requestStart,
                end: finishedTime,
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
        await progress.asyncSet({ stage: 'error', error });
        throw error;
    }
}

export function createLoadDataState(request: LoadDataRequest, extra?: any) {
    const state = new Observer<LoadDataState>({ stage: 'inited' });

    return {
        state,
        // encapsulate logic into separate function since it's async,
        // but we need to return observer for progress tracking purposes
        result: loadDataFromStreamInternal(request, state),
        ...extra
    };
}

export function loadDataFromStream(stream: ReadableStream, options: LoadDataOptions) {
    return createLoadDataState(
        () => ({
            method: 'stream',
            stream,
            resource: options?.resource,
            options
        })
    );
}

export function loadDataFromFile(file: File, options: LoadDataOptions) {
    const resource = extractResourceMetadata(file);

    return createLoadDataState(
        () => ({
            method: 'file',
            stream: streamFromBlob(file),
            resource: options?.resource || resource, // options.resource takes precedence over an extracted resource
            options
        }),
        { title: 'Load data from file: ' + (resource?.name || 'unknown') }
    );
}

export function loadDataFromEvent(event, options) {
    const source = event.dataTransfer || event.target;
    const file = source && source.files && source.files[0];

    event.stopPropagation();
    event.preventDefault();

    if (!file) {
        throw new Error('Can\'t extract a file from an event object');
    }

    return loadDataFromFile(file, options);
}

export function loadDataFromUrl(url: string, options: LoadDataOptions) {
    options = options || {};

    return createLoadDataState(
        async () => {
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
            error.stack = null;
            throw error;
        },
        { title: `Load data from url: ${url}` }
    );
}

export function loadDataFromPush(options: LoadDataOptions) {
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
            resource: resource ? (pushResource = resource) : options.resource, // resource takes precedence over options.resource
            options
        });
    });

    options = options || {};

    return createLoadDataState(
        () => request,
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

export function syncLoaderWithProgressbar({ result, state }, progressbar) {
    return new Promise((resolve, reject) =>
        state.subscribeSync(({ stage, progress, error }, unsubscribe) => {
            if (error) {
                unsubscribe();
                reject(error);
                return;
            }

            if (stage === 'received') {
                unsubscribe();
                resolve(result);
            }

            return progressbar.setState({ stage, progress });
        })
    );
}

export function extractResourceMetadata(
    source: LoadDataResourceSource,
    options?: LoadDataOptions
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

function getGeneratorFromSource(source: LoadDataSource) {
    if (ArrayBuffer.isView(source)) {
        return function*() {
            yield new Uint8Array((source as ArrayBufferView).buffer);
        };
    }

    if (typeof source === 'string') {
        source = [source];
    }

    // allow arrays of strings only
    if (Array.isArray(source)) {
        if (source.some(elem => typeof elem !== 'string')) {
            return;
        }

        return function*() {
            const encoder = new TextEncoder();

            for (const str of (source as string[])) {
                yield encoder.encode(str);
            }
        }
    }

    if (isObject(source)) {
        if (Symbol.asyncIterator in source) {
            return source[Symbol.asyncIterator];
        }

        if (Symbol.iterator in source) {
            return source[Symbol.iterator];
        }
    }
}

export function getReadableStreamFromSource(source: any) {
    if (source instanceof ReadableStream) {
        return source;
    }

    if (source instanceof Response) {
        return source.body;
    }

    if (source instanceof Blob) {
        return streamFromBlob(source);
    }

    return new ReadableStream({
        start() {
            const generator = getGeneratorFromSource(source);

            if (!generator) {
                throw new Error('Bad value type (can\'t convert to a generator)');
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
