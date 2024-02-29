import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { isArray } from '../../core/utils/is-type.js';

const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9\-]+(?:\.[a-z0-9\-]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;
const toString = Object.prototype.toString;

function token(type, str) {
    return `<span class="${type}">${str}</span>`;
}

function more(num) {
    return token('more', `…${numDelim(num)} more…`);
}

export default function value2html(value, compact, options) {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', value);

        case 'number':
        case 'bigint':
            return token('number', numDelim(value));

        case 'symbol':
            return token('symbol', String(value));

        case 'function':
            return 'ƒn';

        case 'string': {
            const maxLength = compact ? options.maxCompactStringLength : options.maxStringLength;
            const shortString = value.length > maxLength + options.allowedExcessStringLength;
            const stringContent = shortString
                ? escapeHtml(JSON.stringify(value.slice(0, maxLength)).slice(1, -1))
                : escapeHtml(JSON.stringify(value).slice(1, -1));
            const stringRest = shortString
                ? more(value.length - maxLength)
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
                const limitCollapsed = options.limitCollapsed === false || options.limitCollapsed > value.length ? value.length : options.limitCollapsed;
                const content = Array.from({ length: limitCollapsed }, (_, index) => value2html(value[index], true, options));

                if (value.length > limitCollapsed) {
                    content.push(`${more(value.length - limitCollapsed)} `);
                }

                return `[${content.join(', ')}]`;
            }

            switch (toString.call(value)) {
                case '[object Set]': {
                    const limitCollapsed = options.limitCollapsed === false || options.limitCollapsed > value.size
                        ? value.size
                        : options.limitCollapsed;
                    const iterator = value.values();
                    const content = Array.from({ length: limitCollapsed }, () => value2html(iterator.next().value, true, options));

                    if (value.size > limitCollapsed) {
                        content.push(`${more(value.size - limitCollapsed)} `);
                    }

                    return `[${content.join(', ')}]`;
                }

                case '[object Date]':
                    return token('date', value);

                case '[object RegExp]':
                    return token('regexp', value);
            }

            if (compact && options.limitCompactObjectEntries === 0) {
                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }

            const limitObjectEntries = compact
                ? options.limitCompactObjectEntries === false ? Infinity : options.limitCompactObjectEntries
                : options.limitCollapsed === false ? Infinity : options.limitCollapsed;
            const content = [];
            let count = 0;

            for (let key in value) {
                if (hasOwnProperty.call(value, key)) {
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
