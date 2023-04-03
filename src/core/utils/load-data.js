import Publisher from '../publisher.js';
import { streamFromBlob } from './stream-from-blob.js';
import parseChunked from '@discoveryjs/json-ext/src/parse-chunked';
import { decode as decodeJsonxl } from '../../tmp/jsonxl-snapshot9.js';

export const dataSource = {
    stream: loadDataFromStream,
    event: loadDataFromEvent,
    file: loadDataFromFile,
    url: loadDataFromUrl,
    push: loadDataFromPush
};

function isSameOrigin(url) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
        return false;
    }
}

// FIXME: That's a temporary solution to make data loading work with a data wrapper
// used in old versions of @discoveryjs/cli
function isDiscoveryCliLegacyDataWrapper(input) {
    const keys = input ? Object.keys(input) : [];
    const expectedKeys = ['name', 'createdAt', 'elapsedTime', 'data'];

    if (keys.length !== 4 || keys.some(key => !expectedKeys.includes(key))) {
        return false;
    }

    return true;
}

function buildDataset({ data: input, ...attributes }, rawMeta) {
    if (isDiscoveryCliLegacyDataWrapper(input)) {
        const { data, ...inputMeta } = input;

        input = data;
        rawMeta = { ...inputMeta, ...rawMeta };
    }

    const data = input;
    const meta = rawMeta || {};

    const { sourceType, sourceName, createdAt, ...restMeta } = meta;

    return {
        sourceType,
        sourceName,
        loadedAt: new Date(),
        createdAt: new Date(Date.parse(createdAt) || Date.now()),
        ...attributes,
        meta: restMeta,
        data
    };
}

const JSONXL_MAGIC_NUMBER = [0x00, 0x00, 0x4a, 0x53, 0x4f, 0x4e, 0x58, 0x4c]; // \0\0JSONXL
function isJsonxl(chunk) {
    return JSONXL_MAGIC_NUMBER.every((code, idx) => code === chunk[idx]);
}

async function parseJsonxl(iterator) {
    const chunks = [];
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

    // Decode data
    return decodeJsonxl(combinedChunks);
}

export function dataFromStream(stream, totalSize, setProgress) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const reader = stream.getReader();
    const streamStartTime = Date.now();
    let size = 0;

    return reader.read().then(firstChunk => {
        const streamConsumer = async function*() {
            try {
                while (true) {
                    const { done, value } = firstChunk || await reader.read();

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
            } finally {
                reader.releaseLock();
            }
        };

        if (isJsonxl(firstChunk.value)) {
            // parse binary format (JSONXL)
            return parseJsonxl(streamConsumer());
        }

        // parse standard JSON
        return parseChunked(streamConsumer);
    }).then(data => ({ data, size }));
}

async function loadDataFromStreamInternal(request, progress) {
    const stage = async (stage, fn) => {
        await progress.asyncSet({ stage });
        return await fn();
    };

    try {
        const startTime = Date.now();
        const {
            stream,
            data: explicitData,
            size: payloadSize,
            validateData
        } = await stage('request', request);
        const requestTime = Date.now() - startTime;
        const { data, size } = explicitData || await stage('receive', () =>
            dataFromStream(stream, Number(payloadSize) || 0, state => progress.asyncSet({
                stage: 'receive',
                progress: state
            }))
        );

        // FIXME: add 'validate' stage?
        if (typeof validateData === 'function') {
            validateData(data);
        }

        await progress.asyncSet({ stage: 'received' });

        return {
            data,
            size,
            payloadSize: Number(payloadSize) || 0,
            time: Date.now() - startTime,
            requestTime
        };
    } catch (error) {
        console.error('[Discovery] Error loading data:', error);
        await progress.asyncSet({ stage: 'error', error });
        throw error;
    }
}

function createLoadDataState(request, meta = {}, extra) {
    const state = new Publisher();

    return {
        state,
        // encapsulate logic into separate function since it's async,
        // but we need to return publisher for progress tracking purposes
        result: loadDataFromStreamInternal(request, state)
            .then(res => ({
                ...res,
                dataset: buildDataset(
                    res,
                    typeof meta === 'function' ? meta() : meta
                )
            })),
        ...extra
    };
}

export function loadDataFromStream(stream, options) {
    return createLoadDataState(
        () => ({
            stream,
            size: options.size
        }),
        () => ({
            sourceType: 'stream',
            sourceName: null,
            ...options.dataMeta
        })
    );
}

export function loadDataFromFile(file, options) {
    return createLoadDataState(
        () => ({
            stream: streamFromBlob(file),
            size: file.size
        }),
        () => ({
            sourceType: 'file',
            sourceName: file.name,
            createdAt: file.lastModified,
            ...options.dataMeta
        }),
        { title: 'Load data from file: ' + file.name }
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

export function loadDataFromUrl(url, options) {
    options = options || {};

    let createdAt;
    const isResponseOk = options.isResponseOk || (response => response.ok);
    const getContentSize = options.getContentSize || ((response) =>
        response.headers.get('x-file-size') ||
        (isSameOrigin(url) && !response.headers.get('content-encoding')
            ? response.headers.get('content-length')
            : undefined)
    );
    const getContentCreatedAt = options.getContentSize || ((response) =>
        response.headers.get('x-file-created-at') ||
        response.headers.get('last-modified')
    );

    return createLoadDataState(
        async () => {
            const response = await fetch(url, options.fetch);

            if (isResponseOk(response)) {
                createdAt = getContentCreatedAt(response);

                return {
                    stream: response.body,
                    size: getContentSize(response),
                    validateData: options.validateData
                };
            }

            const contentType = response.headers.get('content-type') || '';
            let error = await response.text();

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
        () => ({
            sourceType: 'url',
            sourceName: url,
            createdAt,
            ...options.dataMeta
        }),
        { title: `Load data from url: ${url}` }
    );
}

export function loadDataFromPush(options) {
    let controller;
    const stream = new ReadableStream({
        start(controller_) {
            controller = controller_;
        },
        cancel() {
            controller = null;
        }
    });

    options = options || {};

    return createLoadDataState(
        () => ({ stream, size: options.size }),
        () => ({
            sourceType: 'push',
            sourceName: null,
            ...options.dataMeta
        }),
        {
            push(chunk) {
                controller.enqueue(chunk);
            },
            finish() {
                controller.close();
                controller = null;
            }
        }
    );
}

export function syncLoaderWithProgressbar({ result, state }, progressbar) {
    return new Promise((resolve, reject) => {
        const unsubscribeLoader = state.subscribeSync(({ stage, progress, error }) => {
            if (error) {
                unsubscribeLoader();
                reject(error);
                return;
            }

            if (stage === 'received') {
                unsubscribeLoader();
                resolve(result);
            }

            return progressbar.setState({ stage, progress });
        });
    });
}
