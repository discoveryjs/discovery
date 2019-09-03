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
        cache: undefined,
        cacheTtl: 0 // TTL check is disabled
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

    let { model, basedir, cachedir } = options;
    const cwd = process.env.PWD || process.cwd();
    let models;
    let result;

    if (cachedir === true) {
        cachedir = cwd;
    }

    // if no models treat it as single model configuration
    if (!config.models) {
        model = 'default';
        result = {
            name: 'Implicit config',
            cache: cachedir,
            mode: 'single'
        };
        models = {
            default: config
        };
    } else {
        result = Object.assign({
            name: 'Discovery',
            cache: cachedir
        }, config, {
            mode: model ? 'single' : 'multi'
        });
        models = config.models;
    }

    result.favicon = result.favicon
        ? path.resolve(basedir, result.favicon)
        : path.join(__dirname, '../client/favicon.png');

    result.models = Object.keys(models).reduce((res, slug) => {
        if (!model || model === slug) {
            const modelConfig = normalizeModelConfig(
                Object.assign({ slug }, resolveModelConfig(models[slug], basedir))
            );

            switch (modelConfig.cache) {
                case true:
                    modelConfig.cache = cachedir || cwd;
                    break;

                case undefined:
                    modelConfig.cache = result.cache;
                    break;
            }

            res.push(modelConfig);
        }

        return res;
    }, []);

    return result;
}

function load(filename, options) {
    let configFilename = resolveConfigFilename(filename);
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
            const packageJson = require(configFilename);
            config = packageJson.discovery;

            if (typeof packageJson.discovery === 'string') {
                configFilename = path.resolve(path.dirname(configFilename), packageJson.discovery);
                config = require(configFilename);
            } else {
                config = packageJson.discovery;
            }

            config = Object.assign(
                { name: packageJson.name },
                config
            );
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
