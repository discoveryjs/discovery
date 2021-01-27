import Publisher from '../publisher.js';
import { streamFromBlob } from './blob-polyfill.js';
import parseChunked from '@discoveryjs/json-ext/src/parse-chunked';

export const loadDataFrom = {
    stream: loadDataFromStream,
    event: loadDataFromEvent,
    file: loadDataFromFile,
    url: loadDataFromUrl
};

function isSameOrigin(url) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
        return false;
    }
}

export function jsonFromStream(stream, totalSize, setProgress) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    let size = 0;

    return parseChunked(async function*() {
        const reader = stream.getReader();
        const streamStartTime = Date.now();

        try {
            while (true) {
                const { done, value } = await reader.read();

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
    }).then(data => ({ data, size }));
}

async function loadDataFromStreamInternal(request, progress) {
    const stage = async (stage, fn) => {
        await progress.asyncSet({ stage });
        return await fn();
    };

    try {
        const startTime = Date.now();
        const { stream, data: explicitData, size: payloadSize } = await stage('request', request);
        const requestTime = Date.now() - startTime;
        const { data, size } = explicitData || await stage('receive', () =>
            jsonFromStream(stream, Number(payloadSize) || 0, state => progress.asyncSet({
                stage: 'receive',
                progress: state
            }))
        );

        await progress.asyncSet({ stage: 'done' });

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

export function loadDataFromStream(request, prepare) {
    const state = new Publisher();

    return {
        state,
        // encapsulate logic into separate function since it's async,
        // but we need to return publisher for progress tracking purposes
        result: loadDataFromStreamInternal(request, state)
            .then(res => ({
                ...res,
                ...prepare(res.data)
            }))
    };
}

export function loadDataFromFile(file) {
    return loadDataFromStream(
        () => {
            if (file.type !== 'application/json') {
                throw new Error('Not a JSON file');
            }

            return {
                stream: streamFromBlob(file),
                size: file.size
            };
        },
        data => ({
            data,
            context: {
                name: `File: ${file.name}`,
                createdAt: new Date(file.lastModified || Date.now()),
                data
            }
        })
    );
}

export function loadDataFromEvent(event) {
    const source = event.dataTransfer || event.target;
    const file = source && source.files && source.files[0];

    event.stopPropagation();
    event.preventDefault();

    return loadDataFromFile(file);
}

export function loadDataFromUrl(url, dataField) {
    const explicitData = typeof url === 'string' ? undefined : url;

    return loadDataFromStream(
        async () => {
            const response = await fetch(explicitData ? 'data:application/json,{}' : url);

            if (response.ok) {
                return explicitData ? { data: explicitData } : {
                    stream: response.body,
                    size: isSameOrigin(url) && !response.headers.get('content-encoding')
                        ? response.headers.get('content-length')
                        : response.headers.get('x-file-size')
                };
            }

            let error = await response.text();

            if (response.headers.get('content-type') === 'application/json') {
                const json = JSON.parse(error);
                error = json.error || json;
            }

            error = new Error(error);
            error.stack = null;
            throw error;
        },
        data => ({
            data: dataField ? data[dataField] : data,
            context: {
                name: 'Discovery',
                createdAt: dataField && data.createdAt ? new Date(Date.parse(data.createdAt)) : new Date(),
                ...dataField ? data : { data: data }
            }
        })
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

            if (stage === 'done') {
                unsubscribeLoader();
                resolve(result);
                return;
            }

            progressbar.setState({ stage, progress });
        });
    });
}
