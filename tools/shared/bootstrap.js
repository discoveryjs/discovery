const path = require('path');
const configUtils = require('../../src').config;
const utils = require('./utils');

module.exports = fn => options => {
    const configFile = configUtils.resolveConfigFilename(options.configFile);
    const config = !configFile
        ? utils.println('No config is used') || { ...configUtils.normalize({}), name: 'Discovery', mode: 'modelfree', models: [] }
        : utils.process(`Load config from ${path.relative(process.cwd(), configFile).replace(/^(?=[^.\/])/, './')}`, () =>
            configUtils.load(configFile, {
                model: options.model,
                cachedir: options.cache
            })
        );

    fn(options, config);
};
