const fs = require('fs');
const gen = require('../../shared/gen');

module.exports = function collectDataMiddleware(modelConfig, options = {}) {
    const { slug } = modelConfig;
    const CACHEFILE = `.discovery-data.${slug}.cache`;
    let cacheMtime = 0;
    let cache = null;

    function sendFromCache(res, cb) {
        res.set('Content-Type', 'application/json');
        res.send(cache);
        cb();
    }

    function readCache(res, cb) {
        fs.readFile(CACHEFILE, 'utf8', (err, data) => {
            if (err) {
                cacheMtime = 0;
                cb('Cache file read error: ' + err);
                return;
            }

            cache = data;
            sendFromCache(res, cb);
        });
    }

    function collect(res, cb) {
        console.log('Collecting data...');

        gen['/data.json'](modelConfig, options)
            .then(
                data => {
                    console.log('Data collected OK');
                    cache = data;
                    fs.writeFile(CACHEFILE, cache, 'utf8', () => {
                        cacheMtime = fs.statSync(CACHEFILE).mtimeMs;
                        sendFromCache(res, cb);
                    });
                },
                code => {
                    if (code) {
                        console.error('Data collecting FAILED');
                        cb('Process exit with code ' + code);
                    }
                }
            )
            .catch(error => cb('Data collecting error ' + error));
    }

    function getData(req, res) {
        const startTime = Date.now();
        const finish = (error) => {
            if (error) {
                res.status(500).json({ error, data: null });
                console.error(`/${slug}/data error: ${error}`);
            }

            console.log(`/${slug}/data complete in ${Date.now() - startTime}ms`);
        };

        fs.stat(CACHEFILE, (err, stat) => {
            if (err || stat.mtimeMs !== cacheMtime) {
                cacheMtime = 0;
                cache = null;
            }

            if (!err) {
                cacheMtime = stat.mtimeMs;
                if (cache) {
                    sendFromCache(res, finish);
                } else {
                    readCache(res, finish);
                }
            } else {
                collect(res, finish);
            }
        });
    }

    function dropCache(req, res) {
        fs.unlink(CACHEFILE, (err) => {
            if (!err) {
                console.log('Drop cache');
            }

            res.status(200).send('OK');
        });
    }

    return {
        get: getData,
        dropCache
    };
};
