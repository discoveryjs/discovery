import { isRegExp } from './is-type.js';

function matchWithRx(str, pattern, lastIndex) {
    const offset = str.slice(lastIndex).search(pattern);

    return offset !== -1 ? { offset: lastIndex + offset, length: RegExp.lastMatch.length } : null;
};

function matchWithString(str, pattern, lastIndex) {
    const offset = str.indexOf(pattern, lastIndex);

    return offset !== -1 ? { offset, length: pattern.length } : null;
};

export function has(text, pattern, ignoreCase) {
    if (isRegExp(pattern)) {
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
    const next = isRegExp(pattern)
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

        if (match === null || (match.length === 0 && match.offset === lastIndex)) {
            onText(lastIndex > 0 ? text.slice(lastIndex) : text);
            break;
        }

        if (match.length !== 0) {
            if (match.offset !== lastIndex) {
                onText(text.slice(lastIndex, match.offset));
            }

            onMatch(text.substr(match.offset, match.length));
        }

        lastIndex = match.offset + match.length;
    } while (lastIndex !== text.length);
}
