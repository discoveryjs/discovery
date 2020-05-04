/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('content-filter', function(el, config, data, context) {
        const { name = 'filter', type = 'regexp', placeholder, content, onInit, onChange } = config;

        return discovery.view.render(el, {
            view: 'context',
            modifiers: {
                view: 'input',
                name,
                type,
                placeholder: placeholder || 'Filter'
            },
            content: {
                view: 'block',
                className: 'content',
                content,
                onInit,
                onChange
            }
        }, data, context);
    });
}
