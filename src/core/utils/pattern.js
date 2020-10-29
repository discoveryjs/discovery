const { toString } = Object.prototype;
const matchWithRx = (str, pattern, lastIndex) => {
    const offset = str.slice(lastIndex).search(pattern);

    return offset !== -1 ? { offset: lastIndex + offset, length: RegExp.lastMatch.length } : null;
};
const matchWithString = (str, pattern, lastIndex) => {
    const offset = str.indexOf(pattern, lastIndex);

    return offset !== -1 ? { offset, length: pattern.length } : null;
};

export function has(text, pattern, ignoreCase) {
    if (toString.call(pattern) === '[object RegExp]') {
        return ignoreCase && !pattern.ignoreCase
            ? new RegExp(pattern, pattern.flags + 'i').test(text)
            : pattern.test(text);
    }

    if (typeof pattern === 'string') {
        return ignoreCase
            ? String(text).toLowerCase().indexOf(pattern.toLowerCase())
            : String(text).indexOf(pattern) !== -1;
    }

    return false;
}

export function matchAll(text, pattern, onText, onMatch, ignoreCase) {
    const next = toString.call(pattern) === '[object RegExp]'
        ? matchWithRx
        : typeof pattern === 'string'
            ? matchWithString
            : null;

    let matchText = String(text);

    if (ignoreCase) {
        switch (next) {
            case matchWithRx:
                if (!pattern.ignoreCase) {
                    pattern = new RegExp(pattern, pattern.flags + 'i');
                }
                break;

            case matchWithString:
                matchText = matchText.toLowerCase();
                pattern = pattern.toLowerCase();
                break;
        }
    }

    if (next === null) {
        onText(text);
        return;
    }

    let lastIndex = 0;
    do {
        const match = next(matchText, pattern, lastIndex);

        if (match === null) {
            onText(lastIndex > 0 ? text.slice(lastIndex) : text);
            break;
        }

        if (match.offset !== lastIndex) {
            onText(text.slice(lastIndex, match.offset));
        }

        if (match.length !== 0) {
            onMatch(text.substr(match.offset, match.length));
        }

        lastIndex = match.offset + match.length;
    } while (lastIndex !== text.length);
}
