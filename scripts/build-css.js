const path = require('path');
const fs = require('fs');
const bundleCss = require('../tools/shared/bundle-css');

bundleCss(path.join(__dirname, '../client/lib.css'))
    .then(css => fs.writeFileSync(path.join(__dirname, '../dist/lib.css'), css, 'utf8'));
