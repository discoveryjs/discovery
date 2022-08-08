const { writeFileSync } = require('fs');

const content = process.argv[2] === '--rollback'
    ? 'export { version } from \'../package.json\';\n'
    : `export const version = ${JSON.stringify(require('../package.json').version)};\n`;

writeFileSync('./src/version.js', content);
