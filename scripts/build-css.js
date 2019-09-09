const path = require('path');
const fs = require('fs');
const bundleCss = require('@discoveryjs/cli/lib/shared/bundle-css');
const inputFilename = path.join(__dirname, '../src/lib.css');
const outputFilename = path.join(__dirname, '../dist/lib.css');

bundleCss(inputFilename).then(content =>
    fs.writeFileSync(outputFilename, content, 'utf8')
);
