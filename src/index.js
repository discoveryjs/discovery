const cfg = require('./config');

function collectData(config) {
    const startTime = Date.now();
    let fetchData = config.data;

    if (typeof fetchData !== 'function') {
        fetchData = () => {};
    };

    return Promise.resolve(fetchData()).then(data => {
        return {
            name: config.name,
            createdAt: new Date().toISOString(),
            elapsedTime: Date.now() - startTime,
            data
        };
    });
}

module.exports = {
    config: cfg,
    scanFs: require('./scan-fs'),
    collectData
};
