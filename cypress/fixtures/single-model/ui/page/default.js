// FIXME: temporary fix until @discoveryjs/cli bump to next to 2.4.0 version
function tempFix(content) {
    return {
        view: 'context',
        modifiers: [
            (el, config, data, context) => context.model = { name: 'Single model' }
        ],
        content
    };
}

discovery.page.define('default', tempFix([
    'h1:#.model.name',
    'struct'
]));
