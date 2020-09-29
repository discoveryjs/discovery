import jsonExt from '/gen/@discoveryjs/json-ext.js';

export const {
    stringifyInfo: jsonStringifyInfo
} = jsonExt;

function prettyFn(fn, ws, property) {
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
    const minOffset = lines[lines.length - 1].match(/^\s*/)[0].length;
    const stripOffset = new RegExp('^\\s{0,' + minOffset + '}');

    return property + lines
        .map((line, idx) => idx && line.length ? line.replace(stripOffset, ws) : line)
        .join('\n');
}

export function jsonStringifyAsJavaScript(value, replacer, space = 4) {
    const specials = [];
    const jsReplacer = function(key, value) {
        if (typeof value === 'function') {
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
            (_, rn, ws, any, property) => rn + ws + any + prettyFn(specials.shift(), ws, property)
        );
}
