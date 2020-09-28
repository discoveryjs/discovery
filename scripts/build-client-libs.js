const fs = require('fs');
const path = require('path');
const libs = require('../libs');
const baseDir = path.join(__dirname, '../dist');
const distDir = path.join(baseDir, 'gen');

function ensurePath(filepath) {
    const parts = path.dirname(filepath).split('/');

    for (let i = 0; i < parts.length; i++) {
        const fullpath = path.join('/', ...parts.slice(0, i + 1));

        if (!fs.existsSync(fullpath)) {
            console.log('mkdir', fullpath);
            fs.mkdirSync(fullpath);
        }
    }

    return filepath;
}

for (let name in libs) {
    fs.writeFileSync(
        ensurePath(path.join(distDir, libs[name].filename)),
        libs[name].sourceCjs,
        'utf8'
    );
}
