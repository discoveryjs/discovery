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

export function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
}

const hasToStringTag = typeof Symbol.toStringTag === 'symbol';
const $Error = Error as any; // TS doesn't know about Error.isError yet
const $DOMError = globalThis.DOMError as any;
export const isError = typeof $Error.isError === 'function' ? $Error.isError as typeof isErrorFallback : isErrorFallback;
function isErrorFallback(value: unknown): value is Error {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
        return false;
    }

    if (!hasToStringTag || !(Symbol.toStringTag in value)) {
        const str = objectToString(value);
        return str === '[object Error]' || // errors
			str === '[object DOMException]' || // browsers
			str === '[object DOMError]' || // browsers, deprecated
			str === '[object Exception]'; // sentry
    }

    if (typeof $DOMError !== 'undefined' && value instanceof $DOMError) {
        // Edge 80
        return true;
    }

    // fallback for envs with toStringTag but without structuredClone
    return value instanceof Error;
}
