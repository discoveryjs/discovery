const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const collectDataCommand = path.join(__dirname, '../../bin/collect-data');

function wrapCodeIntoDefaultFunction(code) {
    return `export default function(discovery) {\n${code}\n}`;
}

function generateAsset(modelConfig = {}, type) {
    const view = modelConfig.view || {};
    const baseURI = view.basedir || view.base || '';
    const assets = Array.isArray(view.assets)
        ? view.assets
            .filter(asset => path.extname(asset) === type)
            .map(filepath => path.resolve(baseURI, filepath))
        : [];

    return assets.map(filepath => {
        if (!fs.existsSync(filepath)) {
            console.error('File `' + filepath + '` defined in `config.view` is not found');
            return '';
        }

        let content = fs.readFileSync(filepath, 'utf8');

        if (type === '.js') {
            content = `!(function(module, exports){\n${content}\n}).call(this);`;
        }

        return content;
    }).join('');
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

module.exports = {
    '/gen/setup.js': function(options, config, models) {
        return Promise.resolve('export default ' + JSON.stringify({
            name: config.name,
            dev: options.dev,
            models: models.map(({ name, slug }) => ({ name, slug }))
        }));
    },
    '/data.json': function(modelConfig, options = {}, useCacheFile) {
        const { slug } = modelConfig;
        const args = [];

        if (!slug) {
            return Promise.resolve('null');
        }

        if (useCacheFile && fs.existsSync(`.discovery-data.${slug}.cache`)) {
            return Promise.resolve(fs.readFileSync(`.discovery-data.${slug}.cache`, 'utf8'));
        }

        if (options.configFile) {
            args.push(options.configFile);
        }

        args.push('--model', slug);

        return new Promise((resolve, reject) => {
            fork(collectDataCommand, args)
                .on('message', data => resolve(JSON.stringify(data)))
                .on('close', code => {
                    if (code) {
                        reject(code);
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
    '/gen/model-view.js': function(modelConfig) {
        return Promise.resolve(wrapCodeIntoDefaultFunction(generateAsset(modelConfig, '.js')));
    },
    '/gen/model-view.css': function(modelConfig) {
        return Promise.resolve(generateAsset(modelConfig, '.css'));
    }
};
