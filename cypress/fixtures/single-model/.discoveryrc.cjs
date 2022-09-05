module.exports = {
    name: 'Single model',
    data: () => ({ hello: 'world' }),
    view: {
        basedir: __dirname + '/ui',
        assets: [
            'page/default.js'
        ]
    }
};
