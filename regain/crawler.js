const dirTree = require('async-directory-tree');
const parser = require('@babel/parser');
const fs = require('fs');

exports.default = async function main(path, options) {
    const tree = await dirTree(path, options, (item) => {
        if (item.extension === '.ts') {
            item.content = fs.readFileSync(item.path, 'utf-8');
            item.ast = parseTypescript(item.content, item.path);
        }
        if (item.extension === '.js') {
            item.content = fs.readFileSync(item.path, 'utf-8');
            item.ast = parseJavascript(item.content, item.path);
        }
        if (item.extension === '.json') {
            item.content = fs.readFileSync(item.path, 'utf-8');
            item.ast = parseJSON(item.content, item.path);
        }
    });
    return tree;
};

function parseJSON(text, path) {
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error(
            `file ${path} have a problem: ${e.message}`
        );
    }
}


function parseTypescript(text, path) {
    try {
        return parser.parse(text, {
            // parse in strict mode and allow module declarations
            sourceType: 'module',
            plugins: [
                'estree',
                'flowComments',
                'typescript',
                'doExpressions',
                'objectRestSpread',
                'decorators-legacy',
                'classProperties',
                'classPrivateProperties',
                'classPrivateMethods',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'asyncGenerators',
                'functionBind',
                'functionSent',
                'dynamicImport',
                'numericSeparator',
                'optionalChaining',
                'importMeta',
                'bigInt',
                'optionalCatchBinding',
                'throwExpressions',
                'nullishCoalescingOperator'
            ]
        });
    } catch (e) {
        console.error(
            `file ${path} Babel.parse problem: ${e.message}`
        );
    }
}


function parseJavascript(text, path) {
    try {
        return parser.parse(text, {
            // parse in strict mode and allow module declarations
            sourceType: 'module',
            plugins: [
                'estree',
                'flowComments',
                'flow',
                'doExpressions',
                'objectRestSpread',
                'decorators-legacy',
                'classProperties',
                'classPrivateProperties',
                'classPrivateMethods',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'asyncGenerators',
                'functionBind',
                'functionSent',
                'dynamicImport',
                'numericSeparator',
                'optionalChaining',
                'importMeta',
                'bigInt',
                'optionalCatchBinding',
                'throwExpressions',
                'nullishCoalescingOperator'
            ]
        });
    } catch (e) {
        console.error(
            `file ${path} Babel.parse problem: ${e.message}`
        );
    }
}
