const path = require('path');
const configUtils = require('../../src').config;

function preprocessConfigFile(configFile) {
    return configFile
        ? path.relative(process.cwd(), configFile).replace(/^(?=[^.\/])/, './')
        : null;
}

module.exports = fn => options => {
    const configFile = configUtils.resolveConfigFilename(options.configFile);
    const config = configFile
        ? configUtils.load(configFile, {
            model: options.model,
            cachedir: options.cache
        })
        : {
            ...configUtils.normalize({}),
            name: 'Discovery',
            mode: 'modelfree',
            models: []
        };

    return fn(options, config, preprocessConfigFile(configFile));
};
