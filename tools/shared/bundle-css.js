const fs = require('fs');
const path = require('path');
const mime = require('mime');
const csstree = require('css-tree');
const rootdir = path.join(__dirname, '../..');

function resolveFile(node) {
    let url;

    switch (node.type) {
        case 'String':
            url = node.value.substring(1, node.value.length - 1);
            break;

        case 'Raw':
            url = node.value;
            break;

        case 'Url':
            url = resolveFile(node.value);
            break;

        default:
            throw new Error('Unknown value type: ' + csstree.generate(node));
    }

    return url;
}

function inlineResource(uri, baseURI) {
    // do nothing if uri is already a dataURI resource
    if (/^data:/i.test(uri)) {
        return uri;
    }

    const filepath = path.resolve(baseURI, uri);
    const mimeType = mime.getType(filepath);
    let data = fs.existsSync(filepath)
        ? fs.readFileSync(filepath)
        : '';

    return 'data:' + mimeType + ';base64,' + data.toString('base64');
}

function processFile(filename) {
    const ast = csstree.parse(fs.readFileSync(filename, 'utf8'));

    csstree.walk(ast, {
        visit: 'Atrule',
        leave(node, item, list) {
            if (node.name === 'import') {
                const ref = resolveFile(node.prelude.children.first());
                const basepath = /^\/node_modules\//.test(ref) ? rootdir : path.dirname(filename);
                const resolved = path.join(basepath, ref);

                try {
                    list.replace(item, processFile(resolved).children);
                } catch (e) {
                    console.error('ERROR on @import resolving');
                    console.error(JSON.stringify({ filename, basepath, ref, resolved }, null, 4));
                    console.error();
                    console.error(e);
                    process.exit(1);
                }
            }
        }
    });

    csstree.walk(ast, {
        visit: 'Url',
        leave(node) {
            const { type, value } = node.value;
            const url = type === 'String' ? value.substring(1, value.length - 1) : value;

            node.value = {
                type: 'Raw',
                value: inlineResource(url, path.dirname(filename))
            };
        }
    });

    return ast;
}

module.exports = function(filename) {
    return Promise.resolve(csstree.generate(processFile(filename)));
};
