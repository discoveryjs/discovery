// adopted from https://github.com/jimmywarting/Screw-FileReader
export const streamFromBlob = typeof new Blob().stream === 'function'
    ? blob => blob.stream()
    : findFallback();

function findFallback() {
    try {
        new ReadableStream({ type: 'bytes' });
        return fullStreamSupportFallback;
    } catch (e) {
        try {
            new ReadableStream({});
            return basicStreamSupportFallback;
        } catch (e) {
            try {
                new Response(new Blob).body.getReader();
                return fetchTransformFallback;
            } catch (e) {}
        }
    }

    return noFallback;
}

function arrayBufferFromBlob(blob) {
    if (typeof blob.arrayBuffer === 'function') {
        return blob.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onload =
        reader.onerror = ({ type }) => {
            reader.onload =
            reader.onerror = null;

            if (type === 'load') {
                resolve(reader.result || reader);
            } else {
                reject(new Error('Failed to read the blob/file'));
            }
        };
    });
}

function fullStreamSupportFallback(blob) {
    let position = 0;
    return new ReadableStream({
        type: 'bytes',
        autoAllocateChunkSize: 512 * 1024,
        pull(controller) {
            const view = controller.byobRequest.view;
            const chunk = blob.slice(position, position + view.byteLength);

            return arrayBufferFromBlob(chunk).then((buffer) => {
                const uint8array = new Uint8Array(buffer);
                const bytesRead = uint8array.byteLength;

                position += bytesRead;
                view.set(uint8array);
                controller.byobRequest.respond(bytesRead);

                if (position >= blob.size) {
                    controller.close();
                }
            });
        }
    });
}

function basicStreamSupportFallback(blob) {
    let position = 0;
    return new ReadableStream({
        pull(controller) {
            const chunk = blob.slice(position, position + 512 * 1024);

            return arrayBufferFromBlob(chunk).then((buffer) => {
                position += buffer.byteLength;
                controller.enqueue(new Uint8Array(buffer));

                if (position == blob.size) {
                    controller.close();
                }
            });
        }
    });
}

function fetchTransformFallback(blob) {
    return new Response(blob).body;
}

function noFallback() {
    throw new Error('Blob#stream() is not supported and no fallback can be applied, include https://github.com/MattiasBuelens/web-streams-polyfill');
}
