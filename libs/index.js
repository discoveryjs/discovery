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
    prismjs: {
        name: 'Prism',
        files: [
            'prism.js',
            'components/prism-json.js',
            'components/prism-php.js',
            'components/prism-twig.js',
            'components/prism-yaml.js',
            'components/prism-stylus.js'
        ],
        patch(content) {
            return content
                // prevent global polution
                .replace(/_self.Prism = _;/, '')
                // prevent auto-highlighting
                .replace(/document.currentScript.+;/, 'false;');
        }
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

function libContent(name, libConfig) {
    let filesContent = libConfig.files.reduce(
        (res, relFilename) =>
            res + fs.readFileSync(nodeModelPath(name, relFilename), 'utf8'),
        '');

    if (typeof libConfig.patch === 'function') {
        filesContent = libConfig.patch(filesContent);
    }

    return filesContent;
}

for (let name in es6NodeModules) {
    const libConfig = es6NodeModules[name];

    exports[name] = {
        filename: `${name}.js`,
        get source() {
            return es5toEs6(libConfig.name, libContent(name, libConfig), libConfig.imports);
        },
        get sourceCjs() {
            return es5toEs6(libConfig.name, libContent(name, libConfig), libConfig.imports, true);
        }
    };
}
