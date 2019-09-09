/* eslint-env browser */

const chars = [];
const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
const charIndex = b64chars.reduce(function(res, item, index) {
    res[item] = index;
    return res;
}, {});

for (var i = 0; i < 255; i++) {
    chars[i] = String.fromCharCode(i);
}

// utf16 string -> utf8 string
function toUTF8(input) {
    let output = '';

    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);

        if (c < 128) {
            output += chars[c];
        } else {
            if (c < 2048) {
                output += chars[(c >> 6) | 192] +
                          chars[(c & 63) | 128];
            } else {
                output += chars[(c >> 12) | 224] +
                          chars[((c >> 6) & 63) | 128] +
                          chars[(c & 63) | 128];
            }
        }
    }
    return output;
}

// utf16 string -> utf8 bytes array
function toUTF8Bytes(input) {
    // utf16 -> utf8
    input = toUTF8(input);

    // string -> array of bytes
    const output = new Array(input.length);

    for (let i = 0; i < input.length; i++) {
        output[i] = input.charCodeAt(i);
    }

    return output;
}

// utf8 string -> utf16 string
function fromUTF8(input) {
    let output = '';

    for (let i = 0; i < input.length;) {
        const c1 = input.charCodeAt(i++);
        if (c1 < 128) {
            output += String.fromCharCode(c1);
        } else {
            const c2 = input.charCodeAt(i++);
            if (c1 & 32) {
                const c3 = input.charCodeAt(i++);
                output += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            } else {
                output += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
        }
    }
    return output;
}

// utf8 bytes array -> utf16 string
function fromUTF8Bytes(input) {
    return fromUTF8(input.map(function(b) {
        return chars[b];
    }).join(''));
}

export function encode(input) {
    let output = '';

    // convert to bytes array if necessary
    if (!Array.isArray(input)) {
        input = toUTF8Bytes(input);
    }

    for (let i = 0; i < input.length;) {
        const chr1 = input[i++];
        const chr2 = input[i++];
        const chr3 = input[i++];

        let enc1 = chr1 >> 2;
        let enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        let enc4 = chr3 & 63;

        if (chr2 == undefined) {
            enc3 = enc4 = 64;
        } else if (chr3 == undefined) {
            enc4 = 64;
        }

        output += b64chars[enc1] + b64chars[enc2] + b64chars[enc3] + b64chars[enc4];
    }

    return output;
}

export function decode(input) {
    let output = [];
    let enc1;
    let enc2;
    let enc3;
    let enc4;

    input = input.replace(/[^a-zA-Z0-9\+\/]/g, '');

    // decode
    for (let i = 0; i < input.length;) {
        enc1 = charIndex[input.charAt(i++)];
        enc2 = charIndex[input.charAt(i++)];
        enc3 = charIndex[input.charAt(i++)];
        enc4 = charIndex[input.charAt(i++)];

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        output.push(chr1, chr2, chr3);
    }

    if (enc3 == null || enc3 == 64) {
        output.pop();
    }

    if (enc4 == null || enc4 == 64) {
        output.pop();
    }

    // convert to UTF8
    return fromUTF8Bytes(output);
}
