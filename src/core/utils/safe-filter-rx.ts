/* eslint-env browser */

function buildRx(pattern: string, flags?: string) {
    try {
        return new RegExp('((?:' + pattern + ')+)', flags);
    } catch {}

    return new RegExp('((?:' + pattern.replace(/[\[\]\(\)\?\+\*\{\}\\]/g, '\\$&') + ')+)', flags);
}

export function safeFilterRx(pattern: string, flags = 'i') {
    return Object.assign(buildRx(pattern, flags), {
        rawSource: pattern
    });
}
