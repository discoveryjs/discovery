const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdirPromise = promisify(fs.readdir);
const readFilePromise = promisify(fs.readFile);
const statPromise = promisify(fs.stat);

class File {
    constructor(type, filename, size) {
        this.type = type;
        this.filename = filename;
        this.size = size;
        this.defs = [];
        this.refs = [];
        this.errors = [];
    }

    error(message, details) {
        this.errors.push({
            id: this.id,
            message: String(message),
            details
        });
    }
}

function ensureArray(value, fallback) {
    if (Array.isArray(value)) {
        return value;
    }

    return value ? [value] : fallback || [];
}

function isRegExp(value) {
    return value instanceof RegExp;
}

function isString(value) {
    return typeof value === 'string';
}

function isFunction(value) {
    return typeof value === 'function';
}

function normalizeConfig(config) {
    const basedir = config.basedir || process.cwd();
    const generalInclude = new Set(
        ensureArray(config.include)
            .map(item => path.resolve(basedir, item))
    );
    const generalExclude =
        ensureArray(config.exclude, ['node_modules'])
            .map(item => path.resolve(basedir, item));

    const rawRules = ensureArray(config.rules);
    const onlyRule = rawRules.find(rule => rule.only);
    const rules =
        (onlyRule ? [onlyRule] : rawRules)
            .map(rule => {
                let test = null;
                let include = null;
                let exclude = null;
                let type = null;
                let extract = null;

                if (rule.test) {
                    test = ensureArray(rule.test);

                    if (!test.every(isRegExp)) {
                        throw new Error('rule.test should be a RegExp or array of RegExp');
                    }
                }

                if (rule.include) {
                    include = ensureArray(rule.include);

                    if (!include.every(isString)) {
                        throw new Error('rule.include should be a string or array of strings');
                    }

                    include = include.map(item => {
                        item = path.resolve(basedir, item);

                        let dir = item;
                        while (dir !== basedir) {
                            generalInclude.add(dir);
                            dir = path.dirname(dir);
                        }

                        return item;
                    });
                }

                if (rule.exclude) {
                    exclude = ensureArray(rule.exclude);

                    if (!exclude.every(isString)) {
                        throw new Error('rule.exclude should be a string or array of strings');
                    }

                    exclude = exclude.map(item => path.resolve(basedir, item));
                }

                extract = ensureArray(rule.extract, null);
                if (!extract || !extract.every(isFunction)) {
                    throw new Error('rule.extract is required and should be a function or array of functions');
                }

                type = rule.type;
                if (!type || !isString(type)) {
                    throw new Error('rule.type is required and should be a string');
                }

                return {
                    test,
                    include,
                    exclude,
                    type,
                    extract,
                    options: rule.options || null
                };
            });

    return {
        basedir,
        include: generalInclude.size ? [...generalInclude] : null,
        exclude: generalExclude,
        rules
    };
}

module.exports = function scanFs(config, stat) {
    function collect(dir) {
        return readdirPromise(dir).then(files =>
            Promise.all(files.map(fn => {
                const fullpath = path.join(dir, fn);
                const relpath = path.relative(basedir, fullpath);
                const pathCheck = p => fullpath === p || fullpath.startsWith(p + '/');

                if (include && !include.some(pathCheck)) {
                    return;
                }

                if (exclude.some(pathCheck)) {
                    return;
                }

                return statPromise(fullpath).then(stats => {
                    if (stats.isDirectory()) {
                        return collect(fullpath);
                    }

                    filesScanned++;

                    for (let rule of rules) {
                        if (!rule.test.some(rx => rx.test(relpath))) {
                            continue;
                        }

                        if (rule.include && !rule.include.some(pathCheck)) {
                            continue;
                        }

                        if (rule.exclude && rule.exclude.some(pathCheck)) {
                            continue;
                        }

                        const file = new File(
                            rule.type,
                            relpath,
                            stats.size
                        );

                        result.push(file);

                        if (rule.extract.length) {
                            return readFilePromise(fullpath, 'utf8')
                                .then((content = '') =>
                                    rule.extract.forEach(extractor => extractor(file, content, basedir))
                                )
                                .catch(err => {
                                    console.error(err);
                                    file.error(err);
                                });
                        }
                    }
                }).catch(() => { /* ignore errors */ });
            }).filter(Boolean))
        ).catch(err => console.error(err));
    }

    const { basedir, include, exclude, rules } = normalizeConfig(config);
    const result = [];
    const startTime = Date.now();
    let filesScanned = 0;

    return collect(basedir).then(() => {
        if (stat) {
            console.log('Scan FS stat');
            console.log(Object.entries({
                filesScanned,
                filesAdded: result.length,
                time: `${Date.now() - startTime}ms`
            }).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
        }

        return result;
    });
};
