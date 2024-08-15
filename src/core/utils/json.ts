export { stringifyInfo as jsonStringifyInfo } from '@discoveryjs/json-ext';

type Replacer = (key: string, value: any) => void;

function prettyFn(fn: (...args: any[]) => any, ws: string, property: string) {
    const src = String(fn);
    const [prefix, name] = src.match(/^(?:\S+\s+)?(\S+)\(/) || [];

    // method functions, to avoid `name: name() { ... }`
    if (prefix !== 'function' && prefix !== 'function*' && name === property.trim().slice(0, -1)) {
        property = '';
    }

    // one line function
    if (src.indexOf('\n') === -1) {
        return property + src;
    }

    const lines = src.split(/\n/);
    const minOffset = lines[lines.length - 1].match(/^\s*/)?.[0].length || 0;
    const stripOffset = new RegExp('^\\s{0,' + minOffset + '}');

    return property + lines
        .map((line, idx) => idx && line.length ? line.replace(stripOffset, ws) : line)
        .join('\n');
}

function restoreValue(value: any, ws: string, property: string) {
    if (typeof value === 'function') {
        return prettyFn(value, ws, property);
    }

    if (value instanceof Date) {
        return `${property}new Date("${value.toISOString()}")`;
    }

    return property + String(value);
}

const { toString } = Object.prototype;
const specialValueTypes = new Set([
    '[object Function]',
    '[object RegExp]',
    '[object Date]'
]);

export function jsonStringifyAsJavaScript(value: any, replacer: Replacer, space = 4) {
    const specials: any[] = [];
    const jsReplacer = function(key: string, value: any) {
        if (typeof value === 'string' && toString.call(this[key]) === '[object Date]') {
            value = this[key];
        }

        if (value !== null && specialValueTypes.has(toString.call(value))) {
            specials.push(value);
            return '{{{__placeholder__}}}';
        }

        return value;
    };

    return String(JSON.stringify(value, replacer || jsReplacer, space))
        .replace(/"((?:\\.|[^"])*)"(:?)/g,
            (_, content, colon) => colon && /^[a-z$_][a-z$_\d]*$/i.test(content)
                ? content + colon
                : `'${content.replace(/\\"/g, '"').replace(/'/g, '\\\'')}'` + colon
        )
        .replace(/(^|\n)([ \t]*)(.*?)([a-zA-Z$_][a-zA-Z0-9$_]+:\s*)?'{{{__placeholder__}}}'/g,
            (_, rn, ws, any, property) => rn + ws + any + restoreValue(specials.shift(), ws, property)
        );
}
