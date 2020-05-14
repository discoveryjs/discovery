/* eslint-env browser */

function buildRx(pattern, flags) {
    try {
        return new RegExp('((?:' + pattern + ')+)', flags);
    } catch (e) {}

    return new RegExp('((?:' + pattern.replace(/[\[\]\(\)\?\+\*\{\}\\]/g, '\\$&') + ')+)', flags);
}

export default function safeFilterRx(pattern, flags = 'i') {
    const rx = buildRx(pattern, flags);

    rx.rawSource = pattern;

    return rx;
}
