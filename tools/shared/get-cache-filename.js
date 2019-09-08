const path = require('path');

module.exports = function getCacheFilename(modelConfig) {
    let { slug, cache } = modelConfig;

    return slug && cache
        ? path.join(cache, `.discoveryjs.${slug}.cache`)
        : undefined;
};
