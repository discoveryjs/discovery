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
        name: 'Untitled model',
        cache: undefined
    }, config);
}

function resolveModelConfig(value, basedir) {
    if (typeof value === 'string') {
        return require(path.resolve(basedir, value));
    }

    return value;
}

function normalize(config, options) {
    options = options || {};

    const { basedir, cachedir } = options;
    const cwd = process.env.PWD || process.cwd();
    let result;

    if (cachedir === true) {
        cachedir = cwd;
    }

    // if no models treat it as single model configuration
    if (!config.models) {
        return {
            name: 'Implicit config',
            cache: cachedir,
            mode: 'single',
            models: [
                normalizeModelConfig(Object.assign(
                    { slug: 'default' },
                    resolveModelConfig(config, basedir)
                ))
            ]
        };
    } else {
        result = Object.assign({
            name: 'Discovery',
            cache: cachedir
        }, config, {
            mode: 'multi',
            models: Object.keys(config.models || {}).reduce(
                (res, slug) => res.concat(
                    normalizeModelConfig(Object.assign(
                        { slug },
                        resolveModelConfig(config.models[slug], basedir)
                    ))
                ),
                []
            )
        });
    }

    result.models.forEach(modelConfig => {
        switch (modelConfig.cache) {
            case true:
                modelConfig.cache = cachedir || cwd;
                break;

            case undefined:
                modelConfig.cache = result.cache;
                break;
        }
    });

    return result;
}

function loadFromPackageJson(filename) {
    const data = require(filename);

    return Object.assign(
        { name: data.name },
        data.discovery
    );
}

function load(filename, options) {
    const configFilename = resolveConfigFilename(filename);
    let config;

    if (!configFilename) {
        return normalize({}, options);
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

    return normalize(
        config,
        Object.assign({ basedir: path.dirname(configFilename) }, options)
    );
}

module.exports = {
    resolveConfigFilename,
    normalize,
    load
};
