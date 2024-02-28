export function isArrayLike(value) {
    if (typeof value === 'object' && value !== null) {
        switch (toString.call(value)) {
            // array
            case '[object Array]':
            case '[object Int8Array]':
            case '[object Uint8Array]':
            case '[object Uint8ClampedArray]':
            case '[object Int16Array]':
            case '[object Uint16Array]':
            case '[object Int32Array]':
            case '[object Uint32Array]':
            case '[object Float32Array]':
            case '[object Float64Array]':
            case '[object BigInt64Array]':
            case '[object BigUint64Arra]': {
                return true;
            }
        }
    }

    return false;
}
