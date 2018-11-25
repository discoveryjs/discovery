const path = require('path');
const configUtils = require('../../src').config;
const utils = require('./utils');

module.exports = fn => options => {
    const configFile = configUtils.resolveConfigFilename(options.configFile);
    const config = !configFile
        ? utils.println('No config is used') || {}
        : utils.process(`Load config from ${path.relative(process.cwd(), configFile).replace(/^(?=[^.\/])/, './')}`, () =>
            configUtils.load(configFile)
        );

    const singleModel = config.mode === 'single' ? 'default' : options.model;
    const models = Array.isArray(config.models)
        ? config.models.filter(model => !singleModel || model.slug === singleModel)
        : [];

    fn(options, config, models, singleModel);
};
