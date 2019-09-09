/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('section', function(el, config, data, context) {
        const { header, content } = config;

        discovery.view.render(el, [
            { view: 'header', content: header },
            content
        ], data, context);
    });
}
