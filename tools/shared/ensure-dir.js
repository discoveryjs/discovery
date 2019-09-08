const fs = require('fs');
const path = require('path');

module.exports = function ensureDir(filename) {
    var dirpath = path.dirname(path.normalize(filename));

    if (!fs.existsSync(dirpath)) {
        var parts = dirpath.split(path.sep);
        var curpath = parts[0] + path.sep;
        for (var i = 1; i < parts.length; i++) {
            curpath += parts[i] + path.sep;

            if (!fs.existsSync(curpath)) {
                try {
                    fs.mkdirSync(curpath);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    return filename;
};
