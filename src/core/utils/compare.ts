import { hasOwn } from './object-utils.js';

export const deepEqual = (a: any, b: any) => equal(a, b, deepEqual);

export function equal(a: any, b: any, compare = Object.is) {
    if (Object.is(a, b)) {
        return true;
    }

    if (!a || typeof a !== 'object' || !b || typeof b !== 'object') {
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
