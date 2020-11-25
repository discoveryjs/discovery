// adopted from https://github.com/jimmywarting/Screw-FileReader
let fullStreamSupport = false;
let basicStreamSupport = false;
let fetchTransform = false;

try {
    new ReadableStream({});
    basicStreamSupport = true;
} catch (e) {}

try {
    new ReadableStream({ type: 'bytes' });
    fullStreamSupport = true;
} catch (e) {}

try {
    new Response(new Blob).getReader();
    fetchTransform = true;
} catch (e) {}

export function arrayBufferFromBlob(blob) {
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

export function streamFromBlob(blob) {
    let position = 0;

    // Avoid using file.stream() for Safari TP at the moment, since TP 116 crashes on method call in some conditions
    if (typeof blob.stream === 'function' && !/Version\/14\.1/.test(navigator.userAgent)) {
        return blob.stream();
    }

    if (fullStreamSupport) {
        return new ReadableStream({
            type: 'bytes',
            autoAllocateChunkSize: 524288,

            pull(controller) {
                const view = controller.byobRequest.view;
                const chunk = blob.slice(position, position + view.byteLength);

                return arrayBufferFromBlob(chunk).then(function (buffer) {
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

    // basic stream support
    if (basicStreamSupport) {
        return new ReadableStream({
            pull(controller) {
                const chunk = blob.slice(position, position + 524288);

                return arrayBufferFromBlob(chunk).then(function (buffer) {
                    position += buffer.byteLength;
                    controller.enqueue(new Uint8Array(buffer));

                    if (position == blob.size) {
                        controller.close();
                    }
                });
            }
        });
    }

    // fetchTransform
    if (fetchTransform) {
        return new Response(blob).body;
    }

    throw new Error('Include https://github.com/creatorrr/web-streams-polyfill');
}
