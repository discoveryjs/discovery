/* eslint-env browser */

export default function safeFilterRx(pattern) {
    try {
        return new RegExp('((?:' + pattern + ')+)', 'i');
    } catch (e) {}

    return new RegExp('((?:' + pattern.replace(/[\(\)\?\+\*\{\}\\]/g, '\\$&') + ')+)', 'i');
}
