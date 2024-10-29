import { objectToString } from './object-utils.js';

export type TypedArray =
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;

export function isTypedArray(value: unknown): value is TypedArray {
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export function isArray<T>(value: unknown): value is Array<T> | TypedArray {
    return Array.isArray(value) || isTypedArray(value);
}

export function isSet<T>(value: unknown): value is Set<T> {
    return objectToString(value) === '[object Set]';
}

export function isRegExp(value: unknown): value is RegExp {
    return objectToString(value) === '[object RegExp]';
}
