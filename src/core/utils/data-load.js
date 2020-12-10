import Publisher from '../publisher.js';
import { streamFromBlob } from './blob-polyfill.js';
import jsonExt from '/gen/@discoveryjs/json-ext.js';

export const loadStages = {
    request: {
        value: 0.0,
        title: 'Awaiting data'
    },
    receive: {
        value: 0.1,
        title: 'Receiving data'
    },
    parse: {
        value: 0.9,
        title: 'Processing data (parse)'
    },
    apply: {
        value: 0.925,
        title: 'Processing data (prepare)'
    },
    done: {
        value: 1.0,
        title: 'Done!'
    }
};
Object.values(loadStages).forEach((item, idx, array) => {
    item.duration = (idx !== array.length - 1 ? array[idx + 1].value : 0) - item.value;
});

const letRepaintIfNeeded = async () => {
    await new Promise(resolve => setTimeout(resolve, 1));

    if (!document.hidden) {
        return Promise.race([
            new Promise(requestAnimationFrame),
            new Promise(resolve => setTimeout(resolve, 8))
        ]);
    }
};

function isSameOrigin(url) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
        return false;
    }
}

export function jsonFromStream(stream, totalSize, setProgress = () => {}) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB

    return jsonExt.parseChunked(async function*() {
        const reader = stream.getReader();
        const streamStartTime = Date.now();
        let completed = 0;
        let awaitRepaint = Date.now();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    setProgress({
                        done: true,
                        elapsed: Date.now() - streamStartTime,
                        units: 'bytes',
                        completed,
                        total: totalSize
                    });
                    await letRepaintIfNeeded();
                    break;
                }

                for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
                    const chunk = offset === 0 && value.length - offset < CHUNK_SIZE
                        ? value
                        : value.slice(offset, offset + CHUNK_SIZE);

                    completed += chunk.length;
                    yield chunk;

                    const now = Date.now();
                    setProgress({
                        done: false,
                        elapsed: now - streamStartTime,
                        units: 'bytes',
                        completed,
                        total: totalSize
                    });

                    if (now - awaitRepaint > 65 && now - streamStartTime > 200) {
                        await letRepaintIfNeeded();
                        awaitRepaint = Date.now();
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    });
}

async function loadDataFromStreamInternal(request, applyData, progress, timing) {
    const stage = async (stage, fn = () => {}) => {
        const startTime = Date.now();

        try {
            progress.set({ stage });
            await letRepaintIfNeeded();
            return await fn();
        } finally {
            timing.set({ stage, elapsed: Date.now() - startTime });
        }
    };

    try {
        const startTime = Date.now();
        const { stream, data: explicitData, size: payloadSize } = await stage('request', request);
        let size = 0;
        const data = explicitData || await stage('receive', () =>
            jsonFromStream(stream, Number(payloadSize) || 0, state => {
                size = state.completed;
                progress.set({
                    stage: 'receive',
                    progress: state
                });
            })
        );

        const beforeApplyTime = Date.now();
        await stage('apply', () => applyData(data));
        progress.set({ stage: 'done' });

        return {
            data,
            size,
            payloadSize: Number(payloadSize) || 0,
            time: Date.now() - startTime,
            loadTime: beforeApplyTime - startTime,
            applyTime: Date.now() - beforeApplyTime
        };
    } catch (error) {
        progress.set({ stage: 'error', error });
        console.error('[Discovery] Error loading data:', error);
        throw error;
    }
}

export function loadDataFromStream(request, applyData) {
    const state = new Publisher();
    const timing = new Publisher();

    return {
        state,
        timing,
        // encapsulate logic into separate function since it's async,
        // but we need to return publishers for progress tracking purposes
        result: loadDataFromStreamInternal(
            request,
            applyData,
            state,
            timing
        )
    };
}

export function loadDataFromFile(file, applyData) {
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
        data => applyData(data, {
            name: `Discover file: ${file.name}`,
            createdAt: new Date(file.lastModified || Date.now()),
            data
        })
    );
}

export function loadDataFromEvent(event, applyData) {
    const source = event.dataTransfer || event.target;
    const file = source && source.files && source.files[0];

    event.stopPropagation();
    event.preventDefault();

    return loadDataFromFile(file, applyData);
}

export function loadDataFromUrl(url, applyData, dataField) {
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
        data => applyData(
            dataField ? data[dataField] : data,
            {
                name: 'Discovery',
                createdAt: dataField && data.createdAt ? new Date(Date.parse(data.createdAt)) : new Date(),
                ...dataField ? data : { data: data }
            }
        )
    );
}
