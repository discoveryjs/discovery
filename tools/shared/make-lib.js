const fs = require('fs');
const path = require('path');
const resolve = require('resolve');
const { es5toEs6 } = require('./utils');

function nodeModelPath(name, relPath, basedir) {
    return path.join(
        path.dirname(resolve.sync(name + '/package.json', { basedir })),
        relPath
    );
}

module.exports = function makeLib(name, libConfig, resolveDir = path.join(__dirname, '../..')) {
    const filesContent = libConfig.files.reduce(
        (res, relFilename) =>
            res + fs.readFileSync(nodeModelPath(name, relFilename, resolveDir), 'utf8'),
        '');

    return {
        filename: `/gen/${name}.js`,
        get source() {
            return es5toEs6(libConfig.name, filesContent, libConfig.imports);
        },
        get sourceCjs() {
            return es5toEs6(libConfig.name, filesContent, libConfig.imports, true);
        }
    };
};
