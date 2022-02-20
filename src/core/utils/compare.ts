const { hasOwnProperty } = Object;

export function equal(a: Record<any, any>, b: Record<any, any>) {
    if (a === b) {
        return true;
    }

    for (let key in a) {
        if (hasOwnProperty.call(a, key)) {
            if (!hasOwnProperty.call(b, key) || a[key] !== b[key]) {
                return false;
            }
        }
    }

    for (let key in b) {
        if (hasOwnProperty.call(b, key)) {
            if (!hasOwnProperty.call(a, key) || a[key] !== b[key]) {
                return false;
            }
        }
    }

    return true;
}

function isQuoteChar(str: string, index: number) {
    const code = str.charCodeAt(index);

    return code === 34 /* " */ || code === 39 /* ' */ ? 1 : 0;
}

export function fuzzyStringCompare(a: string, b: string) {
    const start = isQuoteChar(a, 0);
    const end = isQuoteChar(a, a.length - 1);

    return b.toLowerCase().indexOf(
        a.toLowerCase().substring(start, a.length - end),
        isQuoteChar(b, 0)
    ) !== -1;
}
