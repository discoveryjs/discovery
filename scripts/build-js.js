const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const babelify = require('babelify');
const libs = require('../libs');

buildLibs(path.join(__dirname, '../dist/gen'));
build(path.join(__dirname, '../src/lib.js'));

function build(inputFilename) {
    return browserify(inputFilename, {
        standalone: 'discovery',
        ignoreMissing: true
    })
        .transform(babelify, {
            presets: [
                ['@babel/preset-env', {
                    exclude: [
                        '@babel/plugin-transform-regenerator'
                    ]
                }]
            ],
            generatorOpts: {
                compact: true,
                comments: false
            }
        })
        .bundle()
        .pipe(process.stdout);
}

function buildLibs(distDir) {
    for (let name in libs) {
        fs.writeFileSync(
            ensurePath(path.join(distDir, libs[name].filename)),
            libs[name].sourceCjs,
            'utf8'
        );
    }
}

function ensurePath(filepath) {
    const parts = path.dirname(filepath).split('/');

    for (let i = 0; i < parts.length; i++) {
        const fullpath = path.join('/', ...parts.slice(0, i + 1));

        if (!fs.existsSync(fullpath)) {
            console.log('mkdir', fullpath);
            fs.mkdirSync(fullpath);
        }
    }

    return filepath;
}
