const path = require('path');
const fs = require('fs');
const bundleJs = require('./shared/bundle-js');
const bundleCss = require('./shared/bundle-css');
const bootstrap = require('./shared/bootstrap');
const utils = require('./shared/utils');
const gen = require('./shared/gen');
const ensureDir = require('../src/ensure-dir');
const rootSrc = path.join(__dirname, '..');
const clientSrc = path.join(rootSrc, 'client');

function createPathResolver(dir) {
    return filename => path.join(dir, filename || '');
}

function relpath(pathname) {
    return path.relative(rootSrc, pathname);
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

function bundleFile(filename, options) {
    switch (path.extname(filename)) {
        case '.js':
            return bundleJs(filename, options)
                .then(js => fs.writeFileSync(filename, js));

        case '.css':
            return bundleCss(filename, options)
                .then(css => fs.writeFileSync(filename, css));
    }
}

function createModel(pathResolver, modelConfig, config, options, jsBundleOptions) {
    [
        'index.html',
        'model.js',
        'model.css'
    ].forEach(filename => {
        copyFile(
            path.join(clientSrc, filename),
            pathResolver(), 'index' + path.extname(filename)
        );
    });

    return Promise
        .all(
            [
                '/data.json',
                '/gen/model-prepare.js',
                '/gen/model-view.js',
                '/gen/model-view.css'
            ].map(filename =>
                gen[filename](modelConfig, options)
                    .then(content => writeFile(pathResolver(filename), content))
            )
        )
        .then(() =>
            gen['/gen/setup.js'](modelConfig, config)
                .then(content => writeFile(pathResolver('gen/setup.js'), content))
        )
        .then(() => utils.process('Build bundles', () =>
            Promise.all([
                bundleFile(pathResolver('index.js'), jsBundleOptions),
                bundleFile(pathResolver('index.css'))
            ])
        ))
        .then(() => utils.section('Clean up', () =>
            rm(pathResolver('gen'))
        ));
}

function copyCommonFiles(dest) {
    [
        'common.css',
        'favicon.png',
        '../dist/lib.js',
        '../dist/lib.css'
    ].forEach(filename => {
        copyFile(path.join(clientSrc, filename), dest);
    });

    return ;
}

module.exports = bootstrap(async function(options, config) {
    const outputDir = options.output;
    const tmpdir = path.join(__dirname, '../../tmp/build');
    const tmpPath = createPathResolver(tmpdir);
    const jsBundleOptions = { noParse: [tmpPath('lib.js')] };

    // check up models
    if (!config.models || !config.models.length) {
        if (options.model) {
            // looks like a user mistake
            console.error(`  Model \`${options.model}\` is not found`);
            process.exit(2);
        }

        // model free mode
        utils.println('Models are not defined (model free mode is enabled)');

        cleanDir(tmpdir);
        Promise.resolve()
            .then(() =>
                copyCommonFiles(tmpdir)
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
            .then(() => utils.section(`Copy files to dest (${outputDir})`, () => {
                if (options.cleanup) {
                    cleanDir(outputDir);
                }

                copyDirContent(tmpPath('modelfree'), outputDir);
            }))
            .then(() =>
                console.log('DONE 🎉')
            );
    } else {
        let pipeline = Promise.resolve();

        cleanDir(tmpdir);

        if (config.mode === 'multi') {
            [
                'index.html',
                'index.js',
                'index.css',
                'logo.svg'
            ].forEach(filename => {
                copyFile(path.join(clientSrc, filename), tmpdir);
            });
        }

        copyCommonFiles(tmpdir);

        pipeline = pipeline.then(() =>
            gen['/gen/setup.js'](null, config)
                .then(content => writeFile(tmpPath('gen/setup.js'), content))
        );

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

        pipeline = pipeline.then(() => utils.section(`Copy files to dest (${outputDir})`, () => {
            if (options.cleanup) {
                cleanDir(outputDir);
            }

            copyDirContent(tmpPath(options.model || ''), outputDir);
        }));

        pipeline.then(() => console.log('DONE 🎉'));
    }
});
