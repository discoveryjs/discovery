const hasOwnProperty = Object.hasOwnProperty;

export function genUniqueId(len = 16) {
    const base36 = (val: number) => Math.round(val).toString(36);
    let uid = base36(10 + 25 * Math.random()); // uid should starts with alpha

    while (uid.length < len) {
        uid += base36(Date.now() * Math.random());
    }

    return uid.substr(0, len);
}

export function equal(a: Object, b: Object) {
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
    return code === 34 /* " */ || code === 39 /* ' */;
}

export function fuzzyStringCmp(a: string, b: string) {
    const start = isQuoteChar(a, 0) ? 1 : 0;
    const end = isQuoteChar(a, a.length - 1) ? 1 : 0;

    return b.toLowerCase().indexOf(
        a.toLowerCase().substring(start, a.length - end),
        isQuoteChar(b, 0) ? 1 : 0
    ) !== -1;
}
