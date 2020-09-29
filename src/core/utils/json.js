import jsonExt from '/gen/@discoveryjs/json-ext.js';

export const {
    stringifyInfo: jsonStringifyInfo
} = jsonExt;

export function jsonStringifyAsJavaScript(value, replacer, space = 4) {
    return JSON
        .stringify(value, replacer, space)
        .replace(/"((?:\\.|[^"])*)"(:?)/g,
            (_, content, colon) => colon && /^[a-z$_][a-z$_\d]*$/i.test(content)
                ? content + colon
                : `'${content.replace(/\\"/g, '"').replace(/'/g, '\\\'')}'` + colon
        );
}
