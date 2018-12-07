const fs = require('fs');
const path = require('path');

let printIdent = 0;
let silent = false;

function es5toEs6(name, code, imports, cjs) {
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
}

function stdoutWrite(str) {
    if (!silent) {
        process.stdout.write(str);
    }
}

function print(...args) {
    stdoutWrite('  '.repeat(printIdent) + args.join(' '));
}

function println(...args) {
    print(...args.concat('\n'));
}

function sectionStart(...args) {
    println(...args);
    printIdent++;
}

function sectionEnd(...args) {
    if (args.length) {
        println(...args);
    }

    printIdent = Math.max(printIdent - 1, 0);
}

function section(name, fn) {
    sectionStart(name);
    const res = fn();

    if (res && typeof res.then === 'function') {
        return res.then(res => {
            sectionEnd();
            return res;
        });
    }

    sectionEnd();
    return res;
}

function processStep(name, fn) {
    print(name + ' ... ');
    const res = fn();

    if (res && typeof res.then === 'function') {
        return res.then(res => {
            stdoutWrite('OK\n');
            return res;
        });
    }

    stdoutWrite('OK\n');
    return res;
}

module.exports = {
    es5toEs6,
    print,
    println,
    section,
    sectionStart,
    sectionEnd,
    process: processStep,
    silent: fn => {
        silent = true;
        fn();
        silent = false;
    }
};
