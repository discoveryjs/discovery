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
    '@discoveryjs/json-ext': {
        name: 'jsonExt',
        files: [
            'dist/json-ext.js'
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
                .replace(/manual:.+?,/, 'manual:true,');
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

function libContent(libPath, libConfig) {
    const filesContent = libConfig.files.reduce(
        (res, relFilename) =>
            res + fs.readFileSync(path.join(libPath, relFilename), 'utf8'),
        ''
    );

    return typeof libConfig.patch === 'function'
        ? libConfig.patch(filesContent)
        : filesContent;
}

for (let name in es6NodeModules) {
    const libConfig = es6NodeModules[name];
    const libPath = path.dirname(require.resolve((libConfig.pkg || name) + '/package.json'));

    exports[name] = {
        name,
        filename: `${name}.js`,
        path: libPath,
        get source() {
            return es5toEs6(libConfig.name, libContent(libPath, libConfig), libConfig.imports);
        },
        get sourceCjs() {
            return es5toEs6(libConfig.name, libContent(libPath, libConfig), libConfig.imports, true);
        }
    };
}
