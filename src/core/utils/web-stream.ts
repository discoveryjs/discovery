import { createBlobFromPrimitive } from './blob';

async function* createStreamIterator<T>(stream: ReadableStream<T>): AsyncIterable<T> {
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}

export function getIterableFromStream<T>(stream: ReadableStream<T>): AsyncIterable<T> {
    if (Symbol.asyncIterator in stream) {
        return stream as AsyncIterable<T>;
    }

    return createStreamIterator(stream);
}

export function getReadableStreamFromSource(source: unknown) {
    if (source instanceof ReadableStream) {
        return source as ReadableStream<Uint8Array>;
    }

    if (source instanceof Response) {
        if (source.body === null) {
            throw new Error('Response has no body');
        }

        return source.body;
    }

    source = createBlobFromPrimitive(source as any) || source;

    if (source instanceof Blob) {
        return source.stream();
    }

    return new ReadableStream<Uint8Array>({
        start() {
            const generator =
                source !== null &&
                typeof source === 'object' &&
                (source[Symbol.asyncIterator] || source[Symbol.iterator]);

            if (typeof generator !== 'function') {
                throw new Error('Bad value type (can\'t convert to a stream)');
            }

            this.iterator = generator.call(source);
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
