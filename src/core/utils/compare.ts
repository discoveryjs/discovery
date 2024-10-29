import { hasOwn } from './object-utils.js';

export const deepEqual = (a: any, b: any) => equal(a, b, deepEqual);

export function equal(a: any, b: any, compare = Object.is) {
    if (Object.is(a, b)) {
        return true;
    }

    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
        return false;
    }

    for (const key in a) {
        if (hasOwn(a, key)) {
            if (!hasOwn(b, key) || !compare(a[key], b[key])) {
                return false;
            }
        }
    }

    for (const key in b) {
        if (hasOwn(b, key)) {
            if (!hasOwn(a, key)) {
                return false;
            }
        }
    }

    return true;
}
