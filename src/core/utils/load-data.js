import parseChunked from '@discoveryjs/json-ext/src/parse-chunked';
import Publisher from '../publisher.js';
import { streamFromBlob } from './stream-from-blob.js';
import { decode as decodeJsonxl } from '../../tmp/jsonxl-snapshot9.js';

export const dataSource = {
    stream: loadDataFromStream,
    event: loadDataFromEvent,
    file: loadDataFromFile,
    url: loadDataFromUrl,
    push: loadDataFromPush
};

function isObject(value) {
    return value !== null && typeof value === 'object';
}

function isSameOrigin(url) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
        return false;
    }
}

function defaultFetchOk(response) {
    return response.ok;
}

function defaultFetchContentEncodedSize(response) {
    return (
        response.headers.get('x-file-encoded-size') ||
        response.headers.get('content-length')
    );
}

function defaultFetchContentSize(response) {
    return (
        response.headers.get('x-file-size') ||
        (isSameOrigin(response.url) && !response.headers.get('content-encoding')
            ? response.headers.get('content-length')
            : undefined)
    );
}

function defaultFetchContentCreatedAt(response) {
    return (
        response.headers.get('x-file-created-at') ||
        response.headers.get('last-modified')
    );
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

function buildDataset(rawData, rawResource, rawMeta, { encoding, size }) {
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
    let encoding = 'json';
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
            encoding = 'jsonxl/snapshot9';
            return parseJsonxl(streamConsumer());
        }

        // parse standard JSON
        return parseChunked(streamConsumer);
    }).then(data => ({ data, encoding, size }));
}

async function loadDataFromStreamInternal(request, progress) {
    const stage = async (stage, fn) => {
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
        const { validateData } = options || {};
        const { data: rawData, encoding, size } = explicitData ? { data: explicitData } : await stage('receive', () =>
            dataFromStream(stream, Number(payloadSize) || 0, state => progress.asyncSet({
                stage: 'receive',
                progress: state
            }))
        );

        // FIXME: add 'validate' stage?
        const validationStart = new Date();
        if (typeof validateData === 'function') {
            validateData(data);
        }

        const finishingStart = new Date();
        await progress.asyncSet({ stage: 'received' });

        const finishedTime = new Date();
        const { data, resource, meta } = buildDataset(rawData, rawResource, null, { size, encoding });

        return {
            loadMethod: method,
            resource,
            meta,
            data,
            timing: {
                time: finishedTime - requestStart,
                start: requestStart,
                end: finishedTime,
                requestTime: responseStart - requestStart,
                requestStart,
                requestEnd: responseStart,
                responseTime: validationStart - responseStart,
                responseStart,
                responseEnd: validationStart,
                validateTime: finishingStart - validationStart,
                validationStart,
                validationEnd: finishingStart
            }
        };
    } catch (error) {
        console.error('[Discovery] Error loading data:', error);
        await progress.asyncSet({ stage: 'error', error });
        throw error;
    }
}

function createLoadDataState(request, extra) {
    const state = new Publisher();

    return {
        state,
        // encapsulate logic into separate function since it's async,
        // but we need to return publisher for progress tracking purposes
        result: loadDataFromStreamInternal(request, state),
        ...extra
    };
}

export function loadDataFromStream(stream, options) {
    return createLoadDataState(
        () => ({
            method: 'stream',
            stream,
            resource: options.resource,
            options
        })
    );
}

export function loadDataFromFile(file, options) {
    const resource = extractResourceMetadata(file);

    return createLoadDataState(
        () => {
            return {
                method: 'file',
                stream: streamFromBlob(file),
                resource: options.resource || resource, // options.resource takes precedence over an extracted resource
                options
            };
        },
        { title: 'Load data from file: ' + (resource.name || 'unknown') }
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

    return createLoadDataState(
        async () => {
            const response = await fetch(url, options.fetch);
            const resource = extractResourceMetadata(response, options);

            if (resource) {
                return {
                    method: 'fetch',
                    stream: response.body,
                    resource: options.resource || resource, // options.resource takes precedence over an extracted resource
                    options
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
    let resolveRequest;
    let pushResource;
    // let rejectRequest;
    const request = new Promise((resolve) => {
        resolveRequest = (resource) => resolve({
            method: 'push',
            stream,
            resource: (pushResource = resource) || options.resource, // resource takes precedence over options.resource
            options
        }) || (resolveRequest = () => {});
        // rejectRequest = reject;
    });

    options = options || {};

    return createLoadDataState(
        () => request,
        {
            start(resource) {
                resolveRequest(resource);
            },
            push(chunk) {
                resolveRequest();
                controller.enqueue(chunk);
            },
            // error(error) {
            //     rejectRequest(error);
            // },
            finish(encodedSize) {
                controller.close();
                controller = null;

                if (isFinite(encodedSize) && pushResource) {
                    pushResource.encodedSize = Number(encodedSize);
                }
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

export function extractResourceMetadata(source, options) {
    if (source instanceof Response) {
        const isResponseOk = options?.isResponseOk || defaultFetchOk;
        const getContentSize = options?.getContentSize || defaultFetchContentSize;
        const getContentEncodedSize = options?.getContentEncodedSize || defaultFetchContentEncodedSize;
        const getContentCreatedAt = options?.getContentSize || defaultFetchContentCreatedAt;

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

function getGeneratorFromSource(source) {
    if (typeof source === 'string' || DataView.isView(source)) {
        return function*() {
            yield new TextEncoder().encode(source);
        };
    }

    // allow arrays of strings only
    if (Array.isArray(source)) {
        if (source.some(elem => typeof elem !== 'string')) {
            return;
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

export function getReadableStreamFromSource(source) {
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
