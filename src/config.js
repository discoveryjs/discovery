const fs = require('fs');
const path = require('path');

function resolveConfigFilename(filename) {
    const cwd = process.env.PWD || process.cwd();

    if (filename) {
        filename = path.resolve(cwd, filename);
    } else {
        const autoFilenames = [
            path.join(cwd, '.discoveryrc.js'),
            path.join(cwd, '.discoveryrc.json'),
            path.join(cwd, '.discoveryrc'),
            path.join(cwd, 'package.json')
        ];

        for (let candidate of autoFilenames) {
            if (fs.existsSync(candidate)) {
                filename = candidate;
                break;
            }
        }

        if (path.basename(filename) === 'package.json') {
            if ('discovery' in require(filename) === false) {
                filename = undefined;
            }
        }
    }

    return filename;
}

function normalizeModelConfig(config) {
    config = config || {};

    return Object.assign({
        slug: config.slug,
        name: 'Untitled model'
    }, config);
}

function resolveModelConfig(value, basepath) {
    if (typeof value === 'string') {
        return require(path.resolve(basepath, value));
    }

    return value;
}

function normalize(config, basepath) {
    // if no models treat it as single model configuration
    if (!config.models) {
        return {
            name: 'Implicit',
            mode: 'single',
            models: [
                normalizeModelConfig(Object.assign(
                    { slug: 'default' },
                    resolveModelConfig(config, basepath)
                ))
            ]
        };
    }

    return Object.assign({
        name: 'Discovery'
    }, config, {
        mode: 'multi',
        models: Object.keys(config.models || {}).reduce(
            (res, slug) => res.concat(
                normalizeModelConfig(Object.assign(
                    { slug },
                    resolveModelConfig(config.models[slug], basepath)
                ))
            ),
            []
        )
    });
}

function loadFromPackageJson(filename) {
    const data = require(filename);

    return Object.assign(
        { name: data.name },
        data.discovery
    );
}

function load(filename) {
    const configFilename = resolveConfigFilename(filename);
    let config;

    if (!configFilename) {
        return normalize({});
    }

    if (!fs.existsSync(configFilename)) {
        throw new Error('Config file is not found: ' + filename);
    }

    switch (path.basename(configFilename)) {
        case '.discoveryrc':
            config = JSON.parse(fs.readFileSync(configFilename, 'utf8'));
            break;

        case 'package.json':
            config = loadFromPackageJson(configFilename);
            break;

        default:
            // .discoveryrc.js
            // .discoveryrc.json
            // or any other
            config = require(configFilename);
    }

    return normalize(config, path.dirname(configFilename));
}

module.exports = {
    resolveConfigFilename,
    normalize,
    load
};
