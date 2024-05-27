const { toString } = Object.prototype;

export function isArray<T>(value: unknown): value is Array<T> | ArrayBufferView {
    return Array.isArray(value) || ArrayBuffer.isView(value);
}

export function isSet<T>(value: unknown): value is Set<T> {
    return toString.call(value) === '[object Set]';
}

export function isRegExp(value: unknown): value is RegExp {
    return toString.call(value) === '[object RegExp]';
}
