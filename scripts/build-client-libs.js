const fs = require('fs');
const path = require('path');
const libs = require('../tools/shared/libs.js');
const { ensureDir } = require('../tools/shared/utils');

for (let name in libs) {
    fs.writeFileSync(
        ensureDir(path.join(__dirname, '../tmp', libs[name].filename)),
        libs[name].sourceCjs,
        'utf8'
    );
}
