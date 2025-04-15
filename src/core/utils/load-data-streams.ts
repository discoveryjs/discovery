export type StreamTransformer = {
    name: string;
    test(chunk: Uint8Array): boolean;
    createTransformStream(): TransformStream;
};

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

export async function consumeStreamAsTypedArray(iterator: AsyncIterableIterator<Uint8Array>) {
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
        for (const transformer of transformers) {
            if (transformer.test(firstChunk)) {
                return transformer;
            }
        }
    }

    return null;
}

export class StreamTransformSelector implements Transformer {
    #transformers: StreamTransformer[];
    #setTransformName?: (name: string) => void;
    #writer: WritableStreamDefaultWriter<Uint8Array> | null;
    #pipe: Promise<void> | null;

    constructor(transformers: StreamTransformer[], setTransformName?: (name: string) => void) {
        this.#transformers = transformers;
        this.#setTransformName = setTransformName;
        this.#writer = null;
        this.#pipe = null;
    }

    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        if (this.#pipe === null) {
            // Select the TransformStream using the first chunk
            const transformer = selectTransformStream(chunk, this.#transformers);

            if (transformer === null) {
                // noop pipe
                this.#pipe = Promise.resolve();
            } else {
                const { readable, writable } = transformer.createTransformStream();

                this.#writer = writable.getWriter();

                // Pipe the readable side of the selected TransformStream to the controller
                this.#pipe = readable.pipeTo(
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

                if (typeof this.#setTransformName === 'function') {
                    this.#setTransformName(transformer.name);
                }
            }
        }

        if (this.#writer !== null) {
            return this.#writer.write(chunk);
        }

        // noop passthrough
        controller.enqueue(chunk);
    }

    async flush() {
        if (this.#writer !== null) {
            this.#writer.close();
            this.#writer = null;
        }

        if (this.#pipe !== null) {
            await this.#pipe;
            this.#pipe = null;
        }
    }
}

export type ProgressTransformerCallback = (
    done: boolean,
    sizeDelta?: number
) => Promise<void>;

const DEFAULT_PROGRESS_CHUNK_SIZE = 1024 * 1024 / 4;
export class ProgressTransformer implements Transformer {
    #setProgress: ProgressTransformerCallback;
    #buffer: string | Uint8Array;
    #chunkSize: number;

    constructor(setProgress: ProgressTransformerCallback, chunkSize = DEFAULT_PROGRESS_CHUNK_SIZE) {
        this.#setProgress = setProgress;
        this.#buffer = '';
        this.#chunkSize = chunkSize;
    }

    async transform(chunk: Uint8Array | string, controller: TransformStreamDefaultController<Uint8Array>) {
        if (typeof this.#buffer !== 'string') {
            await this.#flushBuffer(controller);
        }

        if (typeof chunk === 'string') {
            this.#buffer += chunk;

            if (this.#bufferSize >= this.#chunkSize) {
                return this.#flushBuffer(controller);
            }
        } else {
            this.#buffer = chunk;
            await this.#flushBuffer(controller);
        }
    }

    async flush(controller: TransformStreamDefaultController<Uint8Array | string>) {
        await this.#flushBuffer(controller);
        await this.#setProgress(true);
    }

    get #bufferSize() {
        return this.#buffer.length;
    }

    async #flushBuffer(controller: TransformStreamDefaultController<Uint8Array | string>) {
        const payload = this.#buffer;

        if (this.#bufferSize === 0) {
            return;
        }

        this.#buffer = '';

        for (let offset = 0; offset < payload.length;) {
            const chunk = offset === 0 && payload.length - offset < this.#chunkSize * 1.5
                ? payload
                : payload.slice(offset, offset + this.#chunkSize);

            controller.enqueue(chunk);
            offset += chunk.length;

            await this.#setProgress(false, chunk.length);
        }
    }
}
