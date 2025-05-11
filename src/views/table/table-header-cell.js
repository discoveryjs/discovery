export default function(host) {
    host.view.define('table-header-cell', function(el, config, data, context) {
        let { content, text, initSorting, nextSorting } = config;

        if (typeof nextSorting === 'function') {
            el.classList.add('sortable');
            el.addEventListener('click', () => nextSorting(
                el.classList.contains('asc') ? 'asc'
                    : el.classList.contains('desc') ? 'desc'
                        : 'none'
            ));
        }

        if (initSorting) {
            el.classList.add(initSorting > 0 ? 'asc' : 'desc');
        }

        if (content) {
            return host.view.render(el, content, data, context);
        } else {
            el.textContent = text ?? '';
        }
    }, {
        tag: 'th'
    });
}
