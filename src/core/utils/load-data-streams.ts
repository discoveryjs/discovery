export type StreamTransformer = {
    name: string;
    test(chunk: Uint8Array): boolean;
    createTransformStream(): TransformStream;
};

const CHUNK_SIZE = 1024 * 1024 / 4;

export const defaultStreamTransformers: StreamTransformer[] = [
    {
        name: 'gzip',
        test: (chunk: Uint8Array) => // §2.3.1 @ https://www.rfc-editor.org/rfc/rfc1952
            chunk[0] === 0x1f &&
            chunk[1] === 0x8b &&
            chunk[2] === 8,
        createTransformStream: () => new DecompressionStream('gzip')
    },
    {
        name: 'zlib',
        test: (chunk: Uint8Array) => // §2.2 @ https://www.rfc-editor.org/rfc/rfc1950
            (chunk[0] & 0x0f) === 8 &&
            (chunk[0] >> 4) <= 7 &&
            ((chunk[0] << 8) | chunk[1]) % 31 === 0,
        createTransformStream: () => new DecompressionStream('deflate')
    }
];

export function combinedChunksTotalSize(chunks: Uint8Array[]) {
    return chunks.reduce((totalSize, chunk) => totalSize + chunk.byteLength, 0);
}

export function combineChunks(chunks: Uint8Array[], totalLength?: number) {
    switch (chunks.length) {
        case 0:
            return; // Return undefined to distinguish cases where there are no chunks

        case 1:
            return chunks[0]; // For a single chunk, no actions are needed

        default: {
            // Create a new TypedArray with the combined length
            const combinedChunks = new Uint8Array(totalLength || combinedChunksTotalSize(chunks));

            // Iterate through the input arrays and set their values in the combinedChunks array
            let offset = 0;
            for (const array of chunks) {
                combinedChunks.set(array, offset);
                offset += array.length;
            }

            return combinedChunks;
        }
    }
}

export async function consumeChunksAsSingleTypedArray(iterator: AsyncIterableIterator<Uint8Array>) {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    // Consume chunks
    for await (const chunk of iterator) {
        chunks.push(chunk);
        totalLength += chunk.byteLength;
    }

    // return combined chunks
    return combineChunks(chunks, totalLength);
}

function selectTransformStream(firstChunk: string | Uint8Array, transformers: StreamTransformer[]) {
    if (typeof firstChunk !== 'string') {
        for (const { test, createTransformStream } of transformers) {
            if (test(firstChunk)) {
                return createTransformStream();
            }
        }
    }

    return null;
}

export class StreamTransformSelector implements Transformer {
    transformers: StreamTransformer[];
    writer: WritableStreamDefaultWriter<Uint8Array> | null;
    pipe: Promise<void> | null;

    constructor(transformers: StreamTransformer[]) {
        this.transformers = transformers;
        this.writer = null;
        this.pipe = null;
    }

    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        if (this.pipe === null) {
            // Select the TransformStream using the first chunk
            const streamTransformer = selectTransformStream(chunk, this.transformers);

            if (streamTransformer === null) {
                // noop pipe
                this.pipe = Promise.resolve();
            } else {
                this.writer = streamTransformer.writable.getWriter();

                // Pipe the readable side of the selected TransformStream to the controller
                this.pipe = streamTransformer.readable.pipeTo(
                    new WritableStream({
                        write(chunk) {
                            controller.enqueue(chunk);
                        },
                        close() {
                            controller.terminate();
                        },
                        abort(err) {
                            controller.error(err);
                        }
                    })
                );
            }
        }

        return this.writer !== null
            ? this.writer.write(chunk)
            : controller.enqueue(chunk);
    }

    async flush() {
        if (this.writer !== null) {
            this.writer.close();
            this.writer = null;
        }

        if (this.pipe) {
            await this.pipe;
            this.pipe = null;
        }
    }
}

// ensure first chunk at least highWaterMark bytes long
export class ProbeTransformer implements Transformer {
    highWaterMark: number;
    buffer: Uint8Array[] | null;
    bufferSize: number;

    constructor(highWaterMark = 1024) {
        this.highWaterMark = highWaterMark;
        this.buffer = [];
        this.bufferSize = 0;
    }
    transform(chunk: Uint8Array, controller) {
        // Bypass payload when buffer has already beed flushed
        if (this.buffer === null) {
            controller.enqueue(chunk);
            return;
        }

        // Populate buffer
        this.buffer.push(chunk);
        this.bufferSize += chunk.length;

        // Flush buffer when its size exceeded a threshold
        if (this.bufferSize >= this.highWaterMark) {
            this.flush(controller);
        }
    }
    flush(controller: TransformStreamDefaultController<Uint8Array>) {
        if (this.buffer !== null) {
            const payload = combineChunks(this.buffer);

            if (payload !== undefined) {
                controller.enqueue(payload);
            }

            this.buffer = null;
            this.bufferSize = 0;
        }
    }
}

export type ProgressTransformerCallback = (
    done: boolean,
    sizeDelta?: number,
    decodingTimeDelta?: number
) => Promise<void>;

export class ProgressTransformer implements Transformer {
    setProgress: ProgressTransformerCallback;
    buffer: string | Uint8Array;
    bufferSize: number;

    constructor(setProgress: ProgressTransformerCallback) {
        this.setProgress = setProgress;
        this.buffer = '';
        this.bufferSize = 0;
    }

    async transform(chunk: Uint8Array | string, controller: TransformStreamDefaultController<Uint8Array>) {
        if (typeof chunk === 'string') {
            this.buffer += chunk;
            this.bufferSize += chunk.length;

            if (this.bufferSize >= CHUNK_SIZE) {
                return this.flushBuffer(controller);
            }
        } else {
            await this.flushBuffer(controller);
            this.buffer = chunk;
            await this.flushBuffer(controller);
        }
    }

    async flushBuffer(controller: TransformStreamDefaultController<Uint8Array | string>) {
        if (this.buffer === '') {
            return;
        }

        const payloadChunk = this.buffer;

        this.buffer = '';
        this.bufferSize = 0;

        for (let offset = 0; offset < payloadChunk.length;) {
            const chunkDecodingStartTime = performance.now();
            const chunkSlice = offset === 0 && payloadChunk.length - offset < CHUNK_SIZE * 1.5
                ? payloadChunk
                : payloadChunk.slice(offset, offset + CHUNK_SIZE);

            controller.enqueue(chunkSlice);
            offset += chunkSlice.length;

            await this.setProgress(false, chunkSlice.length, performance.now() - chunkDecodingStartTime);
        }
    }

    async flush(controller) {
        await this.flushBuffer(controller);
        return this.setProgress(true);
    }
}
