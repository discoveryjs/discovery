/* eslint-env browser */

const base64alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64encodeMap = new Uint8Array(64);
const base64decodeMap = new Uint8Array(256);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

for (let i = 0; i < base64alphabet.length; i++) {
    const charCode = base64alphabet.charCodeAt(i);

    base64decodeMap[charCode] = i;
    base64encodeMap[i] = charCode;
}

export function encode(input: string | number[] | Uint8Array): string {
    return decoder.decode(encodeBytes(input));
}

export function encodeBytes(input: string | number[] | Uint8Array): Uint8Array {
    // encode into utf8
    if (typeof input === 'string') {
        input = encoder.encode(input);
    }

    // encode base64
    let output = new Uint8Array(Math.ceil(input.length / 3) * 4);
    let outputIdx = 0;
    let buffer = 0;
    let bufferSize = 0;

    for (let i = 0; i < input.length; i++) {
        // read new 8 bits into buffer
        buffer = (buffer << 8) | input[i];
        bufferSize += 8;

        // dump 6 bits from buffer into output
        while (bufferSize >= 6) {
            const bits = buffer >> (bufferSize -= 6);

            output[outputIdx++] = base64encodeMap[bits];
            buffer -= bits << bufferSize;
        }
    }

    // flush buffer if non-empty
    if (bufferSize !== 0) {
        output[outputIdx++] = base64encodeMap[buffer << (6 - bufferSize)];
    }

    // pad with "="
    for (; outputIdx < output.length;) {
        output[outputIdx++] = '='.charCodeAt(0);
    }

    return output;
}

export function decode(input: string): string {
    return decoder.decode(decodeBase64Bytes(input));
}

export function decodeBase64Bytes(input: string): Uint8Array {
    let inputSize = input.length;

    // ignore trailing "=" (padding)
    while (inputSize > 0 && input[inputSize - 1] === '=') {
        inputSize--;
    }

    // decode
    let output = new Uint8Array(3 * Math.ceil(inputSize / 4));
    let outputIndex = 0;
    let buffer = 0;
    let bufferSize = 0;

    for (let i = 0; i < inputSize; i++) {
        // read new 6 bits into buffer
        buffer = (buffer << 6) | base64decodeMap[input.charCodeAt(i) & 0xff]
        bufferSize += 6;

        // dump 8 bits from buffer into output
        if (bufferSize > 8) {
            const bits = buffer >> (bufferSize -= 8);

            output[outputIndex++] = bits;
            buffer -= bits << bufferSize;
        }
    }

    // flush buffer if non-empty
    if (bufferSize !== 0) {
        output[outputIndex++] = buffer;
    }

    return output.subarray(0,
        // output size:
        // (length / 4) * 3 +
        ((inputSize >> 2) * 3) +
        // (length % 4) * 6 / 8
        (((inputSize % 4) * 6) >> 3)
    );
}
