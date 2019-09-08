const fs = require('fs');
const path = require('path');
const libs = require('../libs');
const distDir = path.join(__dirname, '../dist/gen');

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

for (let name in libs) {
    fs.writeFileSync(
        path.join(distDir, libs[name].filename),
        libs[name].sourceCjs,
        'utf8'
    );
}
