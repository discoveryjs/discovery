const path = require('path');
const fs = require('fs');
const bundleCss = require('@discoveryjs/cli/lib/shared/bundle-css');
const inputFilename = path.join(__dirname, '../src/lib.css');
const outputFilename = path.join(__dirname, '../dist/discovery.css');
const options = {
    isolate: 'style-boundary-Hs94Xo_O',
    isolateRoots: ['discovery', 'discovery-view-popup']
};

bundleCss(inputFilename, options).then(content =>
    fs.writeFileSync(outputFilename, content, 'utf8')
);
