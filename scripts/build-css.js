const path = require('path');
const fs = require('fs');
const bundleCss = require('./utils/bundle-css');
const inputFilename = path.join(__dirname, '../client/lib.css');
const outputFilename = path.join(__dirname, '../dist/lib.css');

bundleCss(inputFilename).then(content =>
    fs.writeFileSync(outputFilename, content, 'utf8')
);
