import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { hasOwn, objectToString } from '../../core/utils/object-utils.js';
import { isArray } from '../../core/utils/is-type.js';
import { matchAll } from '../../core/utils/pattern.js';

const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9\-]+(?:\.[a-z0-9\-]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;

function token(type: string, str: string | number) {
    return `<span class="${type}">${str}</span>`;
}

function more(num: number) {
    return token('more', `… ${numDelim(num)} more`);
}

function stringifySafe(str: string) {
    return escapeHtml(stringifyIfNeeded(str));
}

export function stringifyIfNeeded(value: string) {
    return /[^\x20\x21\x23-\x5B\x5D-\uD799]/.test(value)
        ? JSON.stringify(value).slice(1, -1)
        : value;
}

type RenderValueHtmlOptions = {
    match: RegExp | string | null;
    limitCollapsed: false | number;
    limitCompactObjectEntries: false | number;
    maxCompactPropertyLength: number;
    maxCompactStringLength: number;
    maxStringLength: number;
    allowedExcessStringLength: number;
};

export default function value2html(value: unknown, compact: boolean, options: RenderValueHtmlOptions): string {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', String(value));

        case 'number':
        case 'bigint':
            return token('number', numDelim(value));

        case 'symbol':
            return token('symbol', String(value));

        case 'function':
            return 'ƒn';

        case 'string': {
            const valueLength = value.length;
            const maxLength = compact ? options.maxCompactStringLength : options.maxStringLength;
            const shortString = valueLength > maxLength + options.allowedExcessStringLength;
            let stringContent = '';
            let stringPrefix = '';
            let stringRest = '';

            if (shortString) {
                if (options.match) {
                    const matches: { start: number, end: number }[] = [];
                    const gap = maxLength > 30 ? 10 : 5;
                    const maxMatchLength = maxLength - gap;
                    let offset = 0;
                    let firstMatchOffset = -1;

                    matchAll(
                        value,
                        options.match,
                        (chunk) => {
                            offset += chunk.length;
                        },
                        (chunk, stop) => {
                            if (firstMatchOffset === -1) {
                                firstMatchOffset = offset + maxMatchLength;
                            }

                            if (offset < firstMatchOffset) {
                                matches.push({ start: offset, end: offset + chunk.length });
                            }

                            offset += chunk.length;

                            if (offset > firstMatchOffset) {
                                return stop;
                            }
                        }
                    );

                    if (matches.length > 0) {
                        const start = matches[0].start;
                        let budget = maxLength;

                        if (start !== 0) {
                            const prefix = stringifyIfNeeded(value.slice(0, start));

                            if (start > gap) {
                                const moreLength = 2; // String(start).length + 2;
                                const prefixLength = gap - moreLength;

                                stringPrefix = token('more prefix', ''); // numDelim(start - prefixLength)
                                stringContent = prefix.slice(-prefixLength);
                                budget -= gap;
                            } else {
                                stringContent = prefix;
                            }
                        }

                        for (let i = 0; i < matches.length && budget > 0; i++) {
                            const { start, end } = matches[i];
                            const matchLength = Math.min(end - start, budget);

                            stringContent += token('match', stringifySafe(value.slice(start, start + matchLength)));
                            budget -= matchLength;

                            if (budget > 0) {
                                const isLast = i + 1 >= matches.length;
                                const nextEnd = isLast ? value.length : matches[i + 1].start;
                                const nextTextLength = Math.min(nextEnd - end, budget);

                                if (isLast) {
                                    const rest = value.length - (end + nextTextLength);

                                    if (rest > 0) {
                                        stringRest = token('more suffix', numDelim(rest));
                                    }
                                }

                                if (nextTextLength > 0) {
                                    stringContent += stringifySafe(value.slice(end, end + nextTextLength));
                                    budget -= nextTextLength;
                                }
                            }
                        }
                    }
                }

                if (stringContent === '') {
                    stringContent = stringifySafe(value.slice(0, maxLength));
                    stringRest = token('more suffix', numDelim(valueLength - maxLength));
                }
            } else {
                if (options.match) {
                    matchAll(
                        value,
                        options.match,
                        text => {
                            stringContent += stringifySafe(text);
                        },
                        text => {
                            stringContent += token('match', stringifySafe(text));
                        }
                    );
                } else {
                    stringContent = stringifySafe(value);
                }
            }

            return token(
                'string',
                !compact && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                    ? `"${stringPrefix}<a href="${escapeHtml(value)}" target="_blank">${stringContent}</a>${stringRest}"`
                    : `"${stringPrefix}${stringContent}${stringRest}"`
            );
        }

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            if (isArray(value)) {
                const valueLength = value.length;
                const limitCollapsed = options.limitCollapsed === false || options.limitCollapsed > valueLength ? valueLength : options.limitCollapsed;
                const content = Array.from({ length: limitCollapsed }, (_, index) => value2html(value[index], true, options));

                if (valueLength > limitCollapsed) {
                    content.push(`${more(valueLength - limitCollapsed)} `);
                }

                return `[${content.join(', ')}]`;
            }

            switch (objectToString(value)) {
                case '[object Set]': {
                    const valueSize = (value as Set<unknown>).size;
                    const limitCollapsed = options.limitCollapsed === false || options.limitCollapsed > valueSize
                        ? valueSize
                        : options.limitCollapsed;
                    const iterator = (value as Set<unknown>).values();
                    const content = Array.from({ length: limitCollapsed }, () => value2html(iterator.next().value, true, options));

                    if (valueSize > limitCollapsed) {
                        content.push(`${more(valueSize - limitCollapsed)} `);
                    }

                    return `[${content.join(', ')}]`;
                }

                case '[object Date]':
                    return token('date', String(value));

                case '[object RegExp]':
                    return token('regexp', String(value));
            }

            if (compact && options.limitCompactObjectEntries === 0) {
                for (const key in value) {
                    if (hasOwn(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }

            const limitObjectEntries = compact
                ? options.limitCompactObjectEntries === false ? Infinity : options.limitCompactObjectEntries
                : options.limitCollapsed === false ? Infinity : options.limitCollapsed;
            const content: string[] = [];
            let count = 0;

            for (const key in value) {
                if (hasOwn(value, key)) {
                    if (count < limitObjectEntries) {
                        const property = escapeHtml(key.length > options.maxCompactPropertyLength
                            ? key.slice(0, options.maxCompactPropertyLength) + '…'
                            : key
                        );

                        content.push(`${token('property', property)}: ${value2html(value[key], true, options)}`);
                    }

                    count++;
                }
            }

            if (count > limitObjectEntries) {
                content.push(more(count - limitObjectEntries));
            }

            return content.length ? `{ ${content.join(', ')} }` : '{}';
        }

        default:
            return `unknown type "${typeof value}"`;
    }
}
