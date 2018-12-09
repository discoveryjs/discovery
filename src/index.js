const path = require('path');
const fs = require('fs');
const readFilePromise = require('util').promisify(fs.readFile);
const writeFilePromise = require('util').promisify(fs.writeFile);
const ensureDir = require('./ensure-dir');
const cfg = require('./config');

function getCacheFilename(modelConfig) {
    let { slug, cache } = modelConfig;

    return slug && cache
        ? path.join(cache, `.discoveryjs.${slug}.cache`)
        : undefined;
}

function getData(modelConfig, stringify) {
    const cacheFile = getCacheFilename(modelConfig);

    if (cacheFile && fs.existsSync(cacheFile)) {
        return readFilePromise(cacheFile, 'utf8')
            .then(data => stringify ? data : JSON.parse(data));
    }

    return collectData(modelConfig).then(data => {
        const stringifiedData = stringify || cacheFile ? JSON.stringify(data) : null;

        if (stringify) {
            data = stringifiedData;
        }

        if (cacheFile) {
            return writeFilePromise(ensureDir(cacheFile), stringifiedData, 'utf8')
                .then(() => data);
        }

        return data;
    });
}

function collectData(modelConfig) {
    const startTime = Date.now();
    let fetchData = typeof modelConfig.data === 'function'
        ? modelConfig.data
        : () => {};

    return Promise.resolve(fetchData()).then(data => ({
        name: modelConfig.name,
        createdAt: new Date().toISOString(),
        elapsedTime: Date.now() - startTime,
        data
    }));
}

module.exports = {
    config: cfg,
    scanFs: require('./scan-fs'),
    getCacheFilename,
    getData,
    collectData
};
