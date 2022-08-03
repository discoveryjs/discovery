import { escapeHtml, numDelim } from '../../core/utils/html.js';

const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9\-]+(?:\.[a-z0-9\-]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;

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

            if (value.length > maxLength + options.allowedExcessStringLength) {
                return token(
                    'string',
                    escapeHtml(JSON.stringify(value.slice(0, maxLength)).slice(0, -1)) +
                    more(value.length - maxLength) + '"'
                );
            }

            const str = JSON.stringify(value);

            return token(
                'string',
                !compact && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                    ? `"<a href="${escapeHtml(value)}" target="_blank">${escapeHtml(str.slice(1, -1))}</a>"`
                    : escapeHtml(str)
            );
        }

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            // NOTE: constructor check and instanceof doesn't work here,
            // since a value may come from any runtime
            switch (toString.call(value)) {
                case '[object Array]': {
                    const limitCollapsed = options.limitCollapsed === false ? value.length : options.limitCollapsed;
                    const content = value.slice(0, limitCollapsed).map(val => value2html(val, true, options));

                    if (value.length > limitCollapsed) {
                        content.push(`${more(value.length - limitCollapsed)} `);
                    }

                    return `[${content.join(', ')}]`;
                }

                case '[object Date]':
                    return token('date', value);

                case '[object RegExp]':
                    return token('regexp', value);
            }

            if (compact) {
                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }

            const limitCollapsed = options.limitCollapsed === false ? Infinity : options.limitCollapsed;
            const content = [];
            let count = 0;

            for (let key in value) {
                if (hasOwnProperty.call(value, key)) {
                    if (count < limitCollapsed) {
                        const property = escapeHtml(key.length > options.maxCompactPropertyLength
                            ? key.slice(0, options.maxCompactPropertyLength) + '…'
                            : key
                        );

                        content.push(`${token('property', property)}: ${value2html(value[key], true, options)}`);
                    }

                    count++;
                }
            }

            if (count > limitCollapsed) {
                content.push(more(count - limitCollapsed));
            }

            return content.length ? `{ ${content.join(', ')} }` : '{}';
        }

        default:
            return `unknown type "${typeof value}"`;
    }
}
