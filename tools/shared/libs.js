const makeLib = require('./make-lib');
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

for (let name in es6NodeModules) {
    exports[name] = makeLib(name, es6NodeModules[name]);
}
