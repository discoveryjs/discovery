const { toString } = Object.prototype;

export function isArray(value) {
    return Array.isArray(value) || ArrayBuffer.isView(value);
}

export function isSet(value) {
    return toString.call(value) === '[object Set]';
}

export function isRegExp(value) {
    return toString.call(value) === '[object RegExp]';
}
