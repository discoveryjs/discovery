import { isRegExp } from './is-type.js';

function matchWithRx(str: string, pattern: RegExp, lastIndex: number) {
    const offset = str.slice(lastIndex).search(pattern);

    return offset !== -1 ? { offset: lastIndex + offset, length: RegExp.lastMatch.length } : null;
};

function matchWithString(str: string, pattern: string, lastIndex: number) {
    const offset = str.indexOf(pattern, lastIndex);

    return offset !== -1 ? { offset, length: pattern.length } : null;
};

export function match(text: string, pattern: RegExp | string | null, ignoreCase = false) {
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

export function matchAll(
    text: string,
    pattern: RegExp | string | null,
    onText: (substring: string) => void,
    onMatch: (substring: string) => void,
    ignoreCase = false
) {
    if (!isRegExp(pattern) && typeof pattern !== 'string') {
        onText(text);
        return;
    }

    let matchText = String(text);

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

    let lastIndex = 0;
    do {
        const match = typeof pattern === 'string'
            ? matchWithString(matchText, pattern, lastIndex)
            : matchWithRx(matchText, pattern, lastIndex);

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
