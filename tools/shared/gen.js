const path = require('path');
const fs = require('fs');
const mime = require('mime');
const { fork } = require('child_process');
const collectDataCommand = path.join(__dirname, '../../bin/collect-data');
const assetCommand = path.join(__dirname, '../../bin/asset');

function escapeValueForHtml(value) {
    return String(value)
        .replace(/"/g, '&quot;')
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;');
}

function generateHtml(filepath, modelConfig, config) {
    const favicon = modelConfig.favicon || config.favicon;
    const viewport = modelConfig.viewport || config.viewport;
    const title = modelConfig.name || config.name;
    let html = fs.readFileSync(path.join(__dirname, filepath), 'utf8');

    if (title) {
        html = html.replace(
            /<title>.*?<\/title>/,
            `<title>${title}</title>`
        );
    }

    if (viewport) {
        html = html.replace(
            /<meta name="viewport".*?>/,
            `<meta name="viewport" content="${escapeValueForHtml(viewport)}">`
        );
    }

    if (favicon) {
        html = html.replace(
            /<link rel="icon".*?>/,
            `<link rel="icon" type="${
                escapeValueForHtml(mime.getType(path.extname(favicon)))
            }" href="${
                escapeValueForHtml('favicon' + path.extname(favicon))
            }">`
        );
    }

    return Promise.resolve(html);
}

function generateAsset(type) {
    return (modelConfig = {}, options = {}) => {
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
    };
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
    '/index.html': function(modelConfig, config) {
        return generateHtml('../../client/index.html', {}, config);
    },
    '/model-index.html': function(modelConfig, config) {
        return generateHtml('../../client/model.html', modelConfig, config);
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
    '/gen/model-prepare.js': generateAsset('prepare'),
    '/gen/model-view.js': generateAsset('js'),
    '/gen/model-libs.js': generateAsset('libs-js'),
    '/gen/model-view.css': generateAsset('css'),
    '/gen/model-libs.css': generateAsset('libs-css')
};
