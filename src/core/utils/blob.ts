import { getIterableFromStream } from './web-stream.js';

export type CreateBlobAsyncOptions = BlobPropertyBag & {
    onProgress?(progress: {
        done: boolean;
        written: number;
    }): Promise<void> | void;
};

export function createBlobFromPrimitive(
    source: string | ArrayBufferLike | ArrayBufferView,
    options?: BlobPropertyBag
): Blob | null {
    if (source instanceof Blob) {
        return source;
    }

    if (typeof source === 'string' ||
        ArrayBuffer.isView(source) ||
        source instanceof ArrayBuffer ||
        (source &&
            Symbol.iterator in source === false &&
            Symbol.asyncIterator in source === false)
    ) {
        return new Blob([source], options);
    }

    return null;
}

export function createBlobFromIterable(
    source: string | Iterable<BlobPart> | ArrayBufferLike | ArrayBufferView,
    options?: BlobPropertyBag
): Blob | null {
    if (source instanceof Blob) {
        return source;
    }

    const blobFromPrimitive = createBlobFromPrimitive(source as any, options);
    if (blobFromPrimitive) {
        return blobFromPrimitive;
    }

    // when blobParts iterable then it suitable to be used as source for a Blob
    if (source && Symbol.iterator in (source as any)) {
        return new Blob(source as BlobPart[], options);
    }

    // source is not iterable
    return null;
}

export async function createBlobFromAsyncIterable(
    source: any,
    options?: CreateBlobAsyncOptions
): Promise<Blob | null> {
    if (source instanceof Response) {
        if (source.body === null) {
            throw new Error('Response has no body');
        }

        source = source.body;
    }

    if (source instanceof ReadableStream) {
        source = getIterableFromStream(source);
    }

    if (source && (Symbol.asyncIterator in source || Symbol.iterator in source)) {
        const { onProgress, ...blobOptions } = options || {};
        const blobParts: BlobPart[] = [];
        let written = 0;

        for await (const chunk of source) {
            blobParts.push(chunk);
            written += chunk.bytesLength || chunk.length || chunk.size || 0;
            await onProgress?.({
                done: false,
                written
            });
        }

        await onProgress?.({
            done: true,
            written
        });

        return new Blob(blobParts, blobOptions);
    }

    // source is not iterable
    return null;
}
