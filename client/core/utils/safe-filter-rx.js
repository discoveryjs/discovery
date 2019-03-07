/* eslint-env browser */

export default function safeFilterRx(pattern, flags = 'i') {
    try {
        return new RegExp('((?:' + pattern + ')+)', flags);
    } catch (e) {}

    return new RegExp('((?:' + pattern.replace(/[\(\)\?\+\*\{\}\\]/g, '\\$&') + ')+)', flags);
}
