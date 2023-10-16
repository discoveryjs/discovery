const hasOwn = Object.hasOwn || ((obj, key) => Object.prototype.hasOwnProperty.call(obj, key));

export const deepEqual = (a, b) => equal(a, b, equal);

export function equal(a, b, compare = Object.is) {
    if (a === b) {
        return true;
    }

    if (!a || typeof a !== 'object' || !b || typeof b !== 'object') {
        return false;
    }

    for (const key in a) {
        if (hasOwn(a, key)) {
            if (!hasOwn(b, key) || !compare(a[key], b[key], compare)) {
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
