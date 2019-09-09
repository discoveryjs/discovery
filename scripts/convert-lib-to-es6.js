const fs = require('fs');
const path = require('path');
const es5toEs6 = require('../libs/es5toEs6');
const libFilename = path.join(__dirname, '../src/lib.js');
const libBundleFilename = path.join(__dirname, '../dist/lib.umd.js');
const libContent = fs.readFileSync(libFilename, 'utf8');
const libBundleContent = fs.readFileSync(libBundleFilename, 'utf8');
const exportNames = ((libContent.match(/export {\s*((\S+,\s*)*\S+)\s*}/) || [])[1] || '').split(/\s*,\s*/);

fs.writeFileSync(
    libBundleFilename.replace(/\.umd\./, '.'),
    es5toEs6('discovery', libBundleContent)
        .replace('export default discovery',
            exportNames.length
                ? 'export const ' + exportNames.map(n => `${n} = discovery.${n}`).join(',')
                : ''
        )
);
