/* eslint-env browser */

import Widget from '../widget/index.js';
import * as complexViews from '../views/index-complex.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { reportLink } from './report-link.js';

export default class App extends Widget {
    constructor(container, options) {
        super(container, options);

        this.modelfree = Boolean(options.modelfree);

        this.apply(complexViews);
        this.apply(router);

        this.addBadge(
            'Index',
            () => this.setPage('default'),
            (host) => host.pageId !== 'default' && !host.modelfree
        );
        this.addBadge(
            'Make report',
            () => this.setPage('report'),
            (host) => host.pageId !== 'report' && !host.modelfree
        );
        this.addBadge(
            'Reload with no cache',
            () => fetch('drop-cache').then(() => location.reload()),
            (host) => host.dev && !host.modelfree
        );
        this.addBadge(
            'Switch model',
            () => location.href = '..',
            () => /^\/[^\/]+\//.test(location.pathname)
        );
        this.addBadge(
            (el) => {
                el.classList.add('load-data-badge');
                el.innerHTML = 'Load data<input type="file" accept="application/json,.json">';
                el.lastChild.addEventListener('change', e => this.loadDataFromEvent(e));
            },
            () => {},
            (host) => host.modelfree
        );

        if (this.modelfree && this.dom.container) {
            // Setup the drag&drop listeners
            this.dom.container.addEventListener('drop', e => this.loadDataFromEvent(e), true);
            this.dom.container.addEventListener('dragover', e => {
                e.stopPropagation();
                e.preventDefault();
            }, true);
        }
    }

    setData(data, context = {}) {
        if (this.modelfree) {
            this.pageId = 'report';
        }

        return super
            .setData(data, context)
            .then(() => document.title = this.context.name);
    }

    loadDataFromEvent(event) {
        const source = event.dataTransfer || event.target;
        const file = source && source.files && source.files[0];

        event.stopPropagation();
        event.preventDefault();

        if (file.type !== 'application/json') {
            return;
        }

        const reader = new FileReader();
        reader.onload = event => {
            const data = JSON.parse(event.target.result);

            this.setData(data, {
                name: `Discover file: ${file.name}`,
                createdAt: new Date(),
                data
            });
        };
        reader.readAsText(file);
    }

    loadDataFromUrl(url, dataField) {
        const loadStartTime = Date.now();

        this.dom.loadingOverlay.classList.remove('error', 'done');

        return fetch(url)
            .then(res => {
                console.log(`data loaded in ${Date.now() - loadStartTime}ms`);
                this.dom.loadingOverlay.innerHTML = 'Processing data...';

                return res.json();
            })
            .then(res => {
                if (res.error) {
                    throw new Error(res.error);
                }

                let data = dataField ? res[dataField] : res;
                let context = Object.assign({
                    name: 'Discovery'
                }, dataField ? res : { data: res }, {
                    createdAt: dataField && res.createdAt ? new Date(Date.parse(res.createdAt)) : new Date()
                });

                this.setData(data, context);
                this.dom.loadingOverlay.classList.add('done');
            })
            .catch(e => {
                this.dom.loadingOverlay.classList.add('error');
                this.dom.loadingOverlay.innerHTML =
                    '<pre>Data loading error:<br>' + String(e).replace(/^Error:\s*Error:/, 'Error:') + '</pre>' +
                    '<button onclick="fetch(\'drop-cache\').then(() => location.reload())">Reload with no cache</button>';
                console.error(e);
            });
    }

    setContainer(container) {
        super.setContainer(container);

        if (this.dom.container) {
            this.dom.container.appendChild(
                this.dom.loadingOverlay = createElement('div', 'loading-overlay done', 'Loading...')
            );
        }
    }

    setPage(id, ref, params) {
        super.setPage(this.modelfree ? this.pageId : id, ref, params);
    }

    getPageContext() {
        return {
            ...super.getPageContext(),
            modelfree: this.modelfree
        };
    }

    renderPage() {
        if (this.modelfree && !this.data) {
            this.pageId = 'default';
        }

        super.renderPage();

        document.title = this.getPageContext().name;
    }

    reportLink(...args) {
        return reportLink.apply(this, args);
    }
}
