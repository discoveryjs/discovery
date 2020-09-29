/* eslint-env browser */

export default function(discovery) {
    function render(el, config, data, context) {
        const { content = 'text' } = config;

        return discovery.view.render(el, content, data, context);
    }

    discovery.view.define('alert', render);
    discovery.view.define('alert-success', render);
    discovery.view.define('alert-danger', render);
    discovery.view.define('alert-warning', render);
}
