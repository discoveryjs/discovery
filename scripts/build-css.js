const path = require('path');
const fs = require('fs');
const bundleCss = require('@discoveryjs/cli/lib/shared/bundle-css');
const inputFilename = path.join(__dirname, '../src/lib.css');
const outputPath = path.join(__dirname, '../dist');
const isolateOptions = {
    isolate: 'style-boundary-8H37xEyN'
};

function writeCssFile(task, filename) {
    task.then(({ content }) =>
        fs.writeFileSync(path.join(outputPath, filename), content, 'utf8')
    );
}

writeCssFile(
    bundleCss(inputFilename),
    'discovery.raw.css'
);
writeCssFile(
    bundleCss(inputFilename, isolateOptions),
    'discovery.css'
);
