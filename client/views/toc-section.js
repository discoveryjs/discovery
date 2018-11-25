/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('toc-section', function(el, config, data, context) {
        const { header, content } = config;

        discovery.view.render(el, [
            {
                view: 'block',
                className: 'header',
                content: header
            },
            {
                view: 'block',
                className: 'content',
                content
            }
        ], data, context);
    }, {
        tag: 'section'
    });
}
