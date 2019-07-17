const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const collectDataCommand = path.join(__dirname, '../../bin/collect-data');
const assetCommand = path.join(__dirname, '../../bin/asset');

function wrapCodeIntoDefaultFunction(code) {
    return `export default function(discovery) {\n${code}\n}`;
}

function generateAsset(modelConfig = {}, options = {}, type) {
    const { slug } = modelConfig;
    const args = [];

    if (!slug) {
        return Promise.resolve('');
    }

    if (options.configFile) {
        args.push(options.configFile);
    }

    args.push('--model', slug);
    args.push('--type', type);

    return new Promise((resolve, reject) => {
        fork(assetCommand, args)
            .on('message', data => resolve(data))
            .on('close', code => {
                if (code) {
                    reject(code);
                }
            });
    });
}

function generatePrepare(modelConfig = {}) {
    const { slug, prepare } = modelConfig;

    if (!prepare) {
        return '/* prepare code is not defined in a model config */';
    }

    if (typeof prepare !== 'string') {
        throw new Error(`Error in \`${slug}\` model: prepare option should a string or undefined`);
    }

    if (!fs.existsSync(prepare)) {
        throw new Error(`Error in \`${slug}\` model: path for prepare code (${prepare}) is not found`);
    }

    return fs.readFileSync(prepare, 'utf8');
}

function prepareModel({ name, slug, cache }) {
    return {
        name,
        slug,
        cache: Boolean(cache)
    };
}

module.exports = {
    '/gen/setup.js': function(modelConfig, config) {
        let data = {
            name: config.name,
            mode: config.mode
        };

        if (modelConfig) {
            data.model = prepareModel(modelConfig);
        } else {
            data.models = Array.isArray(config.models) ? config.models.map(model => prepareModel(model)) : [];
        }

        return Promise.resolve('export default ' + JSON.stringify(data));
    },
    '/data.json': function(modelConfig, options = {}) {
        const { slug } = modelConfig;
        const args = [];

        if (!slug) {
            return Promise.resolve('null');
        }

        if (options.configFile) {
            args.push(options.configFile);
        }

        if (options.cache) {
            args.push('--cache');
            if (typeof options.cache === 'string') {
                args.push(options.cache);
            }
        }

        if (options.rewriteCache) {
            args.push('--rewrite-cache');
        }

        if (options.prettyData) {
            args.push('--pretty');
            if (typeof options.prettyData === 'number') {
                args.push(options.prettyData);
            }
        }

        args.push('--model', slug);

        return new Promise((resolve, reject) => {
            fork(collectDataCommand, args)
                .on('message', resolve)
                .on('close', code => {
                    if (code) {
                        reject(new Error('Process exit with code ' + code));
                    }
                });
        });
    },
    '/gen/model-prepare.js': function(modelConfig) {
        return new Promise((resolve, reject) => {
            try {
                resolve(wrapCodeIntoDefaultFunction(generatePrepare(modelConfig)));
            } catch (e) {
                reject(e);
            }
        });
    },
    '/gen/model-view.js': function(modelConfig, options) {
        return generateAsset(modelConfig, options, 'js').then(wrapCodeIntoDefaultFunction);
    },
    '/gen/model-view.css': function(modelConfig, options) {
        return generateAsset(modelConfig, options, 'css');
    }
};
