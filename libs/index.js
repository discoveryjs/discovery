const fs = require('fs');
const path = require('path');
const es5toEs6 = require('./es5toEs6');
const es6NodeModules = {
    jora: {
        name: 'jora',
        files: [
            'dist/jora.js'
        ]
    },
    codemirror: {
        name: 'CodeMirror',
        files: [
            'lib/codemirror.js',
            'mode/javascript/javascript.js'
        ]
    },
    highcharts: {
        name: 'Highcharts',
        files: [
            'js/highcharts.js'
        ]
    },
    prismjs: {
        name: 'Prism',
        files: [
            'prism.js',
            'components/prism-json.js',
            'components/prism-php.js',
            'components/prism-twig.js',
            'components/prism-yaml.js',
            'components/prism-stylus.js'
        ]
    },
    hitext: {
        name: 'hitext',
        files: [
            'dist/hitext.min.js'
        ]
    },
    'hitext-prismjs': {
        name: 'hitextPrismjs',
        imports: {
            Prism: 'prismjs'
        },
        files: [
            'dist/hitext-prismjs.min.js'
        ]
    }
};

function nodeModelPath(name, relPath) {
    return path.join(
        path.dirname(require.resolve(name + '/package.json')),
        relPath
    );
}

for (let name in es6NodeModules) {
    const libConfig = es6NodeModules[name];
    const filesContent = libConfig.files.reduce(
        (res, relFilename) =>
            res + fs.readFileSync(nodeModelPath(name, relFilename), 'utf8'),
        '');

    exports[name] = {
        filename: `${name}.js`,
        get source() {
            return es5toEs6(libConfig.name, filesContent, libConfig.imports);
        },
        get sourceCjs() {
            return es5toEs6(libConfig.name, filesContent, libConfig.imports, true);
        }
    };
}
