const path = require('path');
const fs = require('fs');
const express = require('express');
const utils = require('./shared/utils');
const bootstrap = require('./shared/bootstrap');
const gen = require('./shared/gen');
const libs = require('./shared/libs.js');
const { getCacheFilename } = require('../src');

const ROUTE_DATA = '/data.json';
const ROUTE_RESET_DATA = '/drop-cache';
const ROUTE_MODEL_PREPARE = '/gen/model-prepare.js';
const ROUTE_MODEL_VIEW_JS = '/gen/model-view.js';
const ROUTE_MODEL_VIEW_CSS = '/gen/model-view.css';
const defaultRoutes = {
    [ROUTE_DATA]: (req, res) => res.send({ name: 'Model free mode' }),
    [ROUTE_RESET_DATA]: (req, res) => res.send(null),
    [ROUTE_MODEL_PREPARE]: generate(ROUTE_MODEL_PREPARE),
    [ROUTE_MODEL_VIEW_JS]: generate(ROUTE_MODEL_VIEW_JS),
    [ROUTE_MODEL_VIEW_CSS]: generate(ROUTE_MODEL_VIEW_CSS)
};

const stubApi = new Proxy({}, {
    get: () => function() {
        return this;
    }
});

function generate(filename, ...args) {
    return (req, res) => gen[filename](...args)
        .then(content => {
            res.type(path.extname(filename));
            res.send(content);
        });
}

function generateDataJson(modelConfig, options) {
    const { slug } = modelConfig;
    const prefix = `/${slug}/data.json`;
    const cacheEnabled = Boolean(getCacheFilename(modelConfig));
    let request = null;
    let bgUpdateTimer = null;
    let bgUpdateRequest = null;

    function tryCacheBgUpdate() {
        if (cacheEnabled && !bgUpdateTimer && modelConfig.cacheBgUpdate) {
            const udpateOptions = Object.assign({}, options, { rewriteCache: true });

            console.log(`${prefix} Schedule update cache in background in ${modelConfig.cacheBgUpdate} ms`);
            bgUpdateTimer = setTimeout(
                () => {
                    const bgUpdateStartTime = Date.now();

                    console.log(`${prefix} Start background cache update`);
                    bgUpdateRequest = gen['/data.json'](modelConfig, udpateOptions);
                    bgUpdateRequest.then(() => {
                        bgUpdateRequest = null;
                        bgUpdateTimer = null;
                        console.log(`${prefix} Background cache update done in ${Date.now() - bgUpdateStartTime}ms`);
                        tryCacheBgUpdate();
                    });
                },
                modelConfig.cacheBgUpdate
            );
        }
    }

    return (req, res) => {
        const startTime = Date.now();

        if (!request) {
            request = bgUpdateRequest || gen['/data.json'](modelConfig, options);
            request.then(() => {
                request = null;
                tryCacheBgUpdate();
            });
        }

        return request
            .then(data => {
                res.set('Content-Type', 'application/json');
                res.send(data);
            })
            .catch(error => {
                res.status(500).json({ error, data: null });
                console.error(`${prefix} error: ${error}`);
            })
            .then(() => {
                console.log(`${prefix} complete in ${Date.now() - startTime}ms`);
            });
    };
}

function dropDataCache(modelConfig) {
    return (req, res) => {
        const { slug } = modelConfig;
        const cacheFile = getCacheFilename(modelConfig);

        if (cacheFile) {
            try {
                fs.unlinkSync(cacheFile);
                console.log(`/${slug}/ Drop cache`);
            } catch (e) {
                console.log(`/${slug}/ Drop cache ERROR: ${e}`);
            }
        }

        res.status(200).send('OK');
    };
}

function createModelRouter(modelConfig, options, routes = {}) {
    const { slug } = modelConfig;
    const cacheFilename = getCacheFilename(modelConfig);
    const router = express.Router();

    utils.sectionStart(slug);

    if (typeof modelConfig.extendRouter === 'function') {
        utils.process('Extend router with custom routes', () => {
            modelConfig.extendRouter(router, modelConfig, options);
        });
    }

    utils.process('Define default routes', () => {
        // set up routes
        Object.keys(defaultRoutes).forEach(path =>
            router.get(path, routes[path] || defaultRoutes[path])
        );

        // index html
        router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/model.html')));
        router.get('/model.js', (req, res) => res.sendFile(path.join(__dirname, '../client/model.js')));
        router.get('/model.css', (req, res) => res.sendFile(path.join(__dirname, '../client/model.css')));
    });

    if (cacheFilename) {
        utils.println(`Cache: ENABLED (${path.relative(process.cwd(), cacheFilename)})`);

        if (modelConfig.cacheBgUpdate) {
            utils.println(`  Update in background every ${modelConfig.cacheBgUpdate}ms`);
        }

        if (options.warmup && ROUTE_DATA in routes) {
            utils.process('Warming up cache', () => {
                routes[ROUTE_DATA](stubApi, stubApi);
            });
        }
    } else {
        utils.println('Cache: DISABLED');
    }

    utils.sectionEnd();

    return router;
}

module.exports = bootstrap(function createServer(options, config, models, singleModel) {
    const app = express();

    // check up models
    if (!models.length) {
        if (singleModel) {
            // looks like a user mistake
            console.error(`  Model \`${singleModel}\` is not found`);
            process.exit(2);
        }

        // model free mode
        utils.println('  Models are not defined (model free mode is enabled)');
        utils.silent(() =>
            app.use(createModelRouter({ name: 'Discovery' }, options))
        );
    } else {
        const routers = utils.section(
            singleModel ? 'Init single model' : 'Init models',
            () => models.map(modelConfig => {
                return createModelRouter(modelConfig, options, {
                    [ROUTE_DATA]: generateDataJson(modelConfig, options),
                    [ROUTE_RESET_DATA]: dropDataCache(modelConfig),
                    [ROUTE_MODEL_PREPARE]: generate(ROUTE_MODEL_PREPARE, modelConfig),
                    [ROUTE_MODEL_VIEW_JS]: generate(ROUTE_MODEL_VIEW_JS, modelConfig),
                    [ROUTE_MODEL_VIEW_CSS]: generate(ROUTE_MODEL_VIEW_CSS, modelConfig)
                });
            })
        );

        if (singleModel) {
            app.use(routers[0]);
        } else {
            models.forEach((model, idx) => app.use('/' + model.slug, routers[idx]));
        }
    }

    // common static files
    utils.process('Init common routes', () => {
        app.use(express.static(path.join(__dirname, '../client')));
        app.use('/dist', express.static(path.join(__dirname, '../dist')));
        app.use('/tmp', express.static(path.join(__dirname, '../tmp')));
        app.get('/gen/setup.js', generate('/gen/setup.js', options, config, models));

        for (let name in libs) {
            app.get(libs[name].filename, function(req, res) {
                res.type('.js');
                res.send(libs[name].source);
            });
        }

        Object.keys(libs).forEach(name =>
            app.use(
                '/node_modules/' + name,
                express.static(path.dirname(require.resolve(name + '/package.json')))
            )
        );
    });

    // start server
    app.listen(options.port, function() {
        console.log(`Server listen on http://localhost:${this.address().port}`);
    });
});
