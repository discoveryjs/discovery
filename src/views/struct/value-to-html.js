import { escapeHtml } from '../../core/utils/html.js';

const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9]+(?:\.[a-z0-9]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;

function token(type, str) {
    return `<span class="${type}">${str}</span>`;
}

function more(num) {
    return token('more', `…${num} more…`);
}

export default function value2html(value, linear, options) {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', value);

        case 'number':
        case 'bigint': {
            let str = String(value);

            if (str.length > 3) {
                str = str.replace(/\..+$|\B(?=(\d{3})+(\D|$))/g, m => m || '<span class="num-delim"></span>');
            }

            return token('number', str);
        }

        case 'symbol':
            return token('symbol', String(value));

        case 'function':
            return 'ƒn';

        case 'string': {
            const maxLength = linear ? options.maxLinearStringLength : options.maxStringLength;

            if (value.length > maxLength + 15) {
                return token(
                    'string',
                    escapeHtml(JSON.stringify(value.substr(0, maxLength)))
                        .replace(/"$/, more(value.length - maxLength) + '"')
                );
            }

            const str = escapeHtml(JSON.stringify(value));

            return token(
                'string',
                !linear && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                    ? `"<a href="${escapeHtml(value)}" target="_blank">${str.substr(1, str.length - 2)}</a>"`
                    : str
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

            if (linear) {
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
                        content.push(`${token('property', key)}: ${value2html(value[key], true, options)}`);
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
