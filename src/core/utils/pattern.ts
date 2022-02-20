const { toString } = Object.prototype;
const matchWithRx = (str: string, pattern: RegExp, lastIndex: number) => {
    const offset = str.slice(lastIndex).search(pattern);

    return offset === -1 ? null : {
        offset: lastIndex + offset,
        length: RegExp.lastMatch.length
    };
};
const matchWithString = (str: string, pattern: string, lastIndex: number) => {
    const offset = str.indexOf(pattern, lastIndex);

    return offset === -1 ? null : {
        offset,
        length: pattern.length
    };
};

export function has(text: string, pattern: RegExp | string | null, ignoreCase = false) {
    if (typeof pattern === 'string') {
        return ignoreCase
            ? String(text).toLowerCase().indexOf(pattern.toLowerCase())
            : String(text).indexOf(pattern) !== -1;
    }

    if (toString.call(pattern) === '[object RegExp]') {
        return ignoreCase && !pattern.ignoreCase
            ? new RegExp(pattern, pattern.flags + 'i').test(text)
            : pattern.test(text);
    }

    return false;
}

export function matchAll(text: string, pattern: RegExp | string | null, onText, onMatch, ignoreCase = false) {
    if (toString.call(pattern) !== '[object RegExp]' && typeof pattern !== 'string') {
        onText(text);
        return;
    }

    let matchText = String(text);
    let lastIndex = 0;

    if (ignoreCase) {
        if (typeof pattern === 'string') {
            matchText = matchText.toLowerCase();
            pattern = pattern.toLowerCase();
        } else {
            if (!pattern.ignoreCase) {
                pattern = new RegExp(pattern, pattern.flags + 'i');
            }
        }
    }

    do {
        const match = typeof pattern === 'string'
            ? matchWithString(matchText, pattern, lastIndex)
            : matchWithRx(matchText, pattern, lastIndex);

        if (match === null) {
            onText(lastIndex > 0 ? text.slice(lastIndex) : text);
            break;
        }

        if (match.offset !== lastIndex) {
            onText(text.slice(lastIndex, match.offset));
        }

        if (match.length !== 0) {
            onMatch(text.slice(match.offset, match.length));
        }

        lastIndex = match.offset + match.length;
    } while (lastIndex !== text.length);
}
