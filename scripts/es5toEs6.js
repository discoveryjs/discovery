module.exports = function es5toEs6(name, code, imports, cjs) {
    const importStmts = Object.entries(imports || {}).reduce(
        (res, [ref, lib]) =>
            res.concat(
                cjs
                    ? `var ref = require('/gen/${lib}.js');`
                    : `import ${ref} from '/gen/${lib}.js';`
            ),
        []);
    const exportStmt = cjs
        ? `Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = ${name};`
        : `export default ${name};`;

    return `
        ${importStmts.join('\n')}
        var global = {${Object.keys(imports || {}).join(', ')}};
        var module = undefined;
        var ${name};
        var define = function() {
            const fn = arguments[arguments.length - 1];
            ${name} = fn();
            define = undefined;
        };
        define.amd = true;
        ${code}
        ${exportStmt}
    `;
};
