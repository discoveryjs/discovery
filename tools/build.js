const path = require('path');
const fs = require('fs');
const mime = require('mime');
const bundleJs = require('./shared/bundle-js');
const bundleCss = require('./shared/bundle-css');
const bootstrap = require('./shared/bootstrap');
const utils = require('./shared/utils');
const gen = require('./shared/gen');
const ensureDir = require('../src/ensure-dir');
const rootSrc = path.join(__dirname, '..');
const tmpdir = path.join(__dirname, '../../tmp/build');
const clientSrc = path.join(rootSrc, 'client');

function createPathResolver(dir) {
    return filename => path.join(dir, filename || '');
}

function isRelatedToPath(pathname, dir, name) {
    return pathname.slice(0, dir.length) === dir
        ? `(${name})${pathname.slice(dir.length + 1)}`
        : false;
}

function relpath(pathname) {
    return (
        isRelatedToPath(pathname, rootSrc, 'discovery') ||
        isRelatedToPath(pathname, tmpdir, 'temp') ||
        path.relative(process.cwd(), pathname)
    );
}

function scanFs(pathname, fn, includeDir) {
    if (!fs.existsSync(pathname)) {
        return;
    }

    if (fs.statSync(pathname).isDirectory()) {
        fs.readdirSync(pathname).forEach(relpath =>
            scanFs(path.join(pathname, relpath), fn, includeDir)
        );

        if (includeDir) {
            fn(pathname, true);
        }
    } else {
        fn(pathname, false);
    }
}

function rm(pathname) {
    scanFs(pathname, (pathname, isDir) => {
        utils.println(`Delete ${relpath(pathname)}`);

        if (isDir) {
            fs.rmdirSync(pathname);
        } else {
            fs.unlinkSync(pathname);
        }
    }, true);
}

function copyFile(filename, destDir, newFilename) {
    const src = filename;
    const dest = path.join(destDir, newFilename || path.basename(filename));

    utils.process(`Copy ${relpath(src)} → ${relpath(dest)}`, () =>
        fs.copyFileSync(src, ensureDir(dest))
    );
}

function copyDirContent(dir, dest) {
    fs.readdirSync(dir).forEach(filepath =>
        scanFs(path.join(dir, filepath), filepath =>
            copyFile(filepath, path.dirname(path.join(dest, path.relative(dir, filepath))))
        )
    );
}

function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(filepath =>
            rm(path.join(dir, filepath))
        );
    }
}

function writeFile(dest, content) {
    utils.process(`Write ${relpath(dest)}`, () =>
        fs.writeFileSync(ensureDir(dest), content, 'utf8')
    );
}

function replaceFileContent(pathname, pattern, replace) {
    fs.writeFileSync(
        pathname,
        fs.readFileSync(pathname, 'utf8').replace(pattern, replace),
        'utf8'
    );
}

function readScriptContentWithDataReplaced(pathname, dataFilePath) {
    return fs.readFileSync(pathname, 'utf8')
        .replace(
            /(loadDataFromUrl\()'\.\/data.json'/,
            (m, pre) => pre + fs.readFileSync(dataFilePath,'utf8')
        );
}

function bundleFile(filename, options) {
    const startTime = Date.now();
    let task;

    switch (path.extname(filename)) {
        case '.js':
            task = bundleJs(filename, options);
            break;

        case '.css':
            task = bundleCss(filename, options);
            break;
    }

    return task
        .then(content => fs.writeFileSync(filename, content))
        .then(() => utils.println(relpath(filename), `(${elapsedTime(startTime)}s)`));
}

function createModel(pathResolver, modelConfig, config, options, jsBundleOptions) {
    const modelfreeMode = !config.models || !config.models.length;
    const favicon = '/favicon' + path.extname(modelConfig.favicon || config.favicon);

    ['model.js', 'model.css']
        .forEach(filename => copyFile(path.join(clientSrc, filename), pathResolver(), filename));

    // favicon
    copyFile(
        modelConfig.favicon || config.favicon,
        pathResolver(),
        favicon
    );

    return Promise
        .all(
            [
                '/gen/model-prepare.js',
                '/gen/model-view.js',
                '/gen/model-libs.js',
                '/gen/model-view.css',
                '/gen/model-libs.css'
            ].concat(modelfreeMode ? [] : ['/data.json']).map(filename =>
                gen[filename](modelConfig, options)
                    .then(content => writeFile(pathResolver(filename), content))
            )
        )
        .then(() =>
            Promise.all([
                '/model-index.html',
                '/gen/setup.js'
            ].map(filename => gen[filename](modelConfig, config)
                .then(content => writeFile(pathResolver(filename.replace('model-index.html', 'index.html')), content))
            ))
        )
        .then(() => utils.section('Build bundles', () =>
            Promise.all([
                bundleFile(pathResolver('model.js'), {
                    ...jsBundleOptions
                }),
                bundleFile(pathResolver('model.css'))
            ])
        ))
        .then(() => options.singleFile && utils.section('Convert to single page', () => {
            fs.writeFileSync(
                pathResolver('index.html'),
                fs.readFileSync(pathResolver('index.html'), 'utf8')
                    .replace(/<link rel="icon".+?>/g, m => {
                        utils.println('Inline', m);
                        return m.replace(/\s+href="(.+?)"/, (m, filepath) =>
                            ` href="data:${
                                mime.getType(path.extname(filepath))
                            };base64,${
                                fs.readFileSync(pathResolver(filepath), 'base64')
                            }"`
                        );
                    })
                    .replace(/<link rel="stylesheet".+?>/g, m => {
                        const hrefMatch = m.match(/\s+href="(.+?)"/);

                        return hrefMatch
                            ? utils.println('Inline', m) || `<style>${fs.readFileSync(pathResolver(hrefMatch[1]), 'utf8')}</style>`
                            : m;
                    })
                    .replace(/<script .+?>/g, m => {
                        let scriptSrc = null;
                        const newOpenTag = m.replace(/\s+src="(.+?)"/, (m, src) => (scriptSrc = src, ''));

                        return scriptSrc
                            ? utils.println('Inline', m) || newOpenTag + readScriptContentWithDataReplaced(pathResolver(scriptSrc), pathResolver('data.json'))
                            : m;
                    }),
                'utf8'
            );
        }))
        .then(() => utils.section('Clean up', () => {
            rm(pathResolver('gen'))

            if (options.singleFile) {
                [
                    favicon,
                    'data.json',
                    'model.css',
                    'model.js'
                ].forEach(filepath => rm(pathResolver(filepath)));
            }
        }));
}

function copyCommonFiles(dest, config) {
    utils.section('Copy common files', () => {
        copyFile(config.favicon || path.join(clientSrc, 'favicon.png'), dest);

        [
            'common.css',
            '../dist/lib.js',
            '../dist/lib.css'
        ].forEach(filename =>
            copyFile(path.join(clientSrc, filename), dest)
        );
    });
}

function cleanupTempDir() {
    utils.section('Clean up temp dir', () => cleanDir(tmpdir));
}

function cleanupDestDir(options) {
    if (options.cleanup) {
        utils.section(`Clean up dest dir before write (${options.output})`, () =>
            cleanDir(options.output)
        );
    }
}

function elapsedTime(startTime) {
    return ((Date.now() - startTime) / 1000).toFixed(1);
}

function done(startTime) {
    console.log(`\nDONE 🎉  (in ${elapsedTime(startTime)} sec)`);
}

module.exports = bootstrap(async function(options, config) {
    const outputDir = options.output;
    const tmpPath = createPathResolver(tmpdir);
    const jsBundleOptions = { noParse: [tmpPath('lib.js')] };
    const startTime = Date.now();

    // check up models
    if (!config.models || !config.models.length) {
        if (options.model) {
            // looks like a user mistake
            console.error(`  Model \`${options.model}\` is not found`);
            process.exit(2);
        }

        // model free mode
        utils.println('Models are not defined (model free mode is enabled)');

        cleanupTempDir();

        Promise.resolve()
            .then(() =>
                copyCommonFiles(tmpdir, config)
            )
            .then(() =>
                createModel(
                    createPathResolver(tmpPath('modelfree')),
                    {},
                    config,
                    options,
                    jsBundleOptions
                )
            )
            .then(() => cleanupDestDir(options))
            .then(() => utils.section(`Copy files to dest (${outputDir})`, () =>
                copyDirContent(tmpPath('modelfree'), outputDir)
            ))
            .then(() => done(startTime));
    } else {
        const model = options.model || config.mode === 'single' && config.models[0].slug || false;
        let pipeline = Promise.resolve();

        cleanupTempDir();

        if (config.mode === 'multi') {
            [
                'index.js',
                'index.css',
                'logo.svg'
            ].forEach(filename => {
                copyFile(path.join(clientSrc, filename), tmpdir);
            });

            pipeline = pipeline.then(() =>
                Promise.all([
                    '/index.html',
                    '/gen/setup.js'
                ].map(filename => gen[filename](null, config)
                    .then(content => writeFile(tmpPath(filename), content))
                ))
            );
        }

        copyCommonFiles(tmpdir, config);

        pipeline = pipeline.then(() => utils.section('Build models', () =>
            config.models.reduce(
                (pipeline, modelConfig) =>
                    pipeline.then(() => utils.section(modelConfig.slug, () =>
                        createModel(
                            createPathResolver(tmpPath(modelConfig.slug)),
                            modelConfig,
                            config,
                            options,
                            jsBundleOptions
                        )
                    )),
                Promise.resolve()
            )
        ));

        if (config.mode === 'multi') {
            pipeline = pipeline.then(() => utils.process('Build index page bundles', () =>
                Promise.all([
                    bundleFile(tmpPath('index.js'), jsBundleOptions),
                    bundleFile(tmpPath('index.css'))
                ])
            ));
        }

        pipeline = pipeline.then(() =>
            utils.section('Clean up', () => {
                [
                    'gen',
                    'common.css',
                    'lib.css',
                    'lib.js',
                    'logo.svg'
                ].forEach(path => rm(tmpPath(path)));
            })
        );

        pipeline = pipeline.then(() => cleanupDestDir(options));
        pipeline = pipeline.then(() => utils.section(`Copy files to dest (${outputDir})`, () => {
            copyDirContent(tmpPath(model || ''), outputDir);
        }));

        pipeline.then(() => done(startTime));
    }
});
