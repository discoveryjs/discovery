import { decode as decodeBase64 } from '../../core/utils/base64.js';

const imageDatauriRx = /^data:image\/([a-z\+]+?(?:;base64)?),/;
const pathSrcRx = /^([a-z\-]+:|\.{0,2}\/)/i;

function isSvg(content: string) {
    if (content.includes('http://www.w3.org/2000/svg')) {
        // ensure the content contains "<svg " or "<svg:" - a most common patterns for SVG
        return /(?:<|%3[cC])svg[:\s]/.test(content);
    }

    return false;
}

export function isImageDataUri(value: unknown) {
    return typeof value === 'string' && imageDatauriRx.test(value);
}

export function getImageDataUri(value: unknown) {
    const image = getImageContent(value);

    if (image === null) {
        return;
    }

    return `data:image/${image.type},${image.content}`;
}

export function isImageSrc(value: unknown) {
    return (
        typeof value === 'string' &&
        pathSrcRx.test(value) &&
        (isImageDataUri(value) || !isImageContent(value))
    );
}

export function getImageSrc(value: unknown) {
    if (typeof value !== 'string') {
        return;
    }

    return isImageSrc(value)
        ? value
        : getImageDataUri(value);
}

export function isImageContent(value: unknown) {
    return getImageContent(value) !== null;
}

export function getImageContent(value: unknown) {
    if (typeof value === 'string' && value.length > 100) {
        let type: string | null = null;
        let content: string | null = null;

        switch (value.charCodeAt(0)) {
            case 0x2f: // /
                if (value.startsWith('/9j/')) {
                    // https://en.wikipedia.org/wiki/JPEG
                    // JPEG magick number: ff d8 ff
                    // base64: /9j/
                    type = 'jpeg;base64';
                    content = value;
                }
                break;
            case 0x25:
            case 0x3c: // <
                if (isSvg(value)) {
                    type = 'svg+xml';
                    content = value;
                }
                break;
            case 0x41:
                if (value.startsWith('AAAB') || value.startsWith('AAAC')) {
                    type = 'ico;base64';
                    content = value;
                }
                break;
            case 0x50: // P
                // possible SVG starts with "<?xml " or "<sv"
                // in base64 it's PD94bWwg or PHN2
                if (value.startsWith('PD94bWwg') || value.startsWith('PHN2')) {
                    // double sure the content contains "<svg " or "<svg:" - a most common patterns
                    if (isSvg(decodeBase64(value))) {
                        type = 'svg+xml;base64';
                        content = value;
                    }
                }
                break;
            case 0x52: // R
                if (value.startsWith('R0lGODdh') || value.startsWith('R0lGODlh')) {
                    // https://en.wikipedia.org/wiki/GIF
                    // GIF magick number: GIF87a / GIF89a
                    // base64: R0lGODdh / R0lGODlh
                    type = 'gif;base64';
                    content = value;
                }
                break;
            case 0x64: // d
                if (value.startsWith('data:image/')) {
                    const match = value.match(imageDatauriRx);

                    if (match !== null) {
                        type = match[1];
                        content = value.slice(match[0].length);
                    }
                }
                break;
            case 0x69: // i
                if (value.startsWith('iVBORw0KGg')) {
                    // https://en.wikipedia.org/wiki/PNG
                    // PNG magick number: 89 50 4e 47 0d 0a 1a 0a
                    // base64: iVBORw0KGgo=
                    type = 'png;base64';
                    content = value;
                } else if (value.startsWith('image/')) {
                    // image/whatever;(base64,)?...
                    const match = value.match(/^image\/([a-z\+]+?(;base64)?),/);

                    if (match !== null) {
                        type = match[1];
                        content = value.slice(match[0].length);
                    }
                }
                break;
        }

        if (type !== null && content !== null) {
            return { type, content };
        }
    }

    return null;
}
