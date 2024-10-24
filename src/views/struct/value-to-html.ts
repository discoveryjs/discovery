import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { isArray } from '../../core/utils/is-type.js';

const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9\-]+(?:\.[a-z0-9\-]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;
const toString = Object.prototype.toString;
const hasOwn = Object.hasOwn || ((object, key) => Object.prototype.hasOwnProperty.call(object, key));

function token(type: string, str: string) {
    return `<span class="${type}">${str}</span>`;
}

function more(num: number) {
    return token('more', `… ${numDelim(num)} more`);
}

type Options = {
    limitCollapsed: false | number;
    limitCompactObjectEntries: false | number;
    maxCompactPropertyLength: number;
    maxCompactStringLength: number;
    maxStringLength: number;
    allowedExcessStringLength: number;
};

export default function value2html(value: unknown, compact: boolean, options: Options) {
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
            const stringContent = shortString
                ? escapeHtml(JSON.stringify(value.slice(0, maxLength)).slice(1, -1))
                : escapeHtml(JSON.stringify(value).slice(1, -1));
            const stringRest = shortString
                ? more(valueLength - maxLength)
                : '';

            return token(
                'string',
                !compact && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                    ? `"<a href="${escapeHtml(value)}" target="_blank">${stringContent}</a>${stringRest}"`
                    : `"${stringContent}${stringRest}"`
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

            switch (toString.call(value)) {
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
