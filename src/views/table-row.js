/* eslint-env browser */

export default function(host) {
    host.view.define('table-row', function(el, config, data, context) {
        const { cols } = config;

        if (Array.isArray(cols)) {
            return Promise.all(cols.map((col, index) =>
                host.view.render(el, col, data, { ...context, colIndex: index })
            ));
        }
    }, { tag: 'tr' });
}
