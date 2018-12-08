const fs = require('fs');
const gen = require('../../shared/gen');
const { getCacheFilename } = require('../../../src');

module.exports = function collectDataMiddleware(modelConfig, options = {}) {
    const { slug } = modelConfig;

    function getData(req, res) {
        const startTime = Date.now();
        const finish = (error) => {
            if (error) {
                res.status(500).json({ error, data: null });
                console.error(`/${slug}/data error: ${error}`);
            }

            console.log(`/${slug}/data complete in ${Date.now() - startTime}ms`);
        };

        gen['/data.json'](modelConfig, options)
            .then(data => {
                res.set('Content-Type', 'application/json');
                res.send(data);
                finish();
            })
            .catch(err => finish(err));

    }

    function dropCache(req, res) {
        const cacheFile = getCacheFilename(modelConfig);

        if (cacheFile) {
            fs.unlink(cacheFile, (err) => {
                if (!err) {
                    console.log(`/${slug}/ Drop cache`);
                }

                res.status(200).send('OK');
            });
        } else {
            res.status(200).send('OK');
        }
    }

    return {
        get: getData,
        dropCache
    };
};
