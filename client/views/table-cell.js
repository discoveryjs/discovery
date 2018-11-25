/* eslint-env browser */

function defaultCellRender(el, data) {
    if (Array.isArray(data)) {
        el.className = 'details complex';
        el.innerText = data.length ? '[…]' : '[]';
        return;
    }

    if (data && typeof data === 'object') {
        el.className = 'details complex';
        for (let k in data) {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
                el.innerText = '{…}';
                return;
            }
        }
        el.innerText = '{}';
        return;
    }

    if (data === undefined) {
        el.innerText = '';
        return;
    }

    if (typeof data === 'number') {
        el.className = 'number';
    }

    el.innerText = data;
}

export default function(discovery) {
    discovery.view.define('table-cell', function(el, config, data, context) {
        const { content, details } = config;

        if (details) {
            el.className = 'details';
        }

        if (content) {
            discovery.view.render(el, content, data, context);
        } else {
            defaultCellRender(el, data);
        }

        if (el.classList.contains('details')) {
            el.addEventListener('click', (e) => {
                let node = e.target;

                if (node === el) {
                    const rowEl = node.parentNode;
                    const bodyEl = rowEl.parentNode;
                    const currentDetailsEl = Array
                        .from(bodyEl.querySelectorAll('.view-table-cell.details-expanded'))
                        .find(td => td.parentNode.parentNode === bodyEl);
                    let detailsEl = null;

                    if (currentDetailsEl) {
                        const currentDetailsRowEl = currentDetailsEl.parentNode;

                        currentDetailsEl.classList.remove('details-expanded');

                        if (currentDetailsEl === el) {
                            rowEl.parentNode.removeChild(rowEl.nextSibling);
                            return;
                        }

                        if (currentDetailsRowEl !== rowEl) {
                            currentDetailsRowEl.parentNode.removeChild(currentDetailsRowEl.nextSibling);
                        } else {
                            detailsEl = rowEl.nextSibling.firstChild;
                            detailsEl.innerHTML = '';
                        }
                    }

                    if (detailsEl === null) {
                        detailsEl = rowEl.parentNode
                            .insertBefore(document.createElement('tr'), rowEl.nextSibling)
                            .appendChild(document.createElement('td'));
                        detailsEl.parentNode.className = 'view-table-cell-details-content';
                        detailsEl.colSpan = 1000;
                    }

                    el.classList.add('details-expanded');
                    discovery.view.render(detailsEl, details || { view: 'struct', expanded: true }, data, context);
                }
            });
        }
    }, {
        tag: 'td'
    });
}
