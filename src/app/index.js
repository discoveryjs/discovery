/* eslint-env browser */

import Widget from '../widget/index.js';
import * as complexViews from '../views/index-complex.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';

export default class App extends Widget {
    constructor(container, options = {}) {
        super(container, null, options);

        this.mode = options.mode;

        this.apply(complexViews);
        this.apply(router);

        this.addBadge(
            'Index',
            () => this.setPage('default'),
            (host) => host.pageId !== 'default' && host.mode !== 'modelfree'
        );
        this.addBadge(
            'Make report',
            () => this.setPage('report'),
            (host) => host.pageId !== 'report' && host.mode !== 'modelfree'
        );
        this.addBadge(
            'Reload with no cache',
            () => fetch('drop-cache').then(() => location.reload()),
            () => options.cache
        );
        this.addBadge(
            'Switch model',
            () => location.href = '..',
            (host) => host.mode === 'multi'
        );
        this.addBadge(
            (el) => {
                el.classList.add('load-data-badge');
                el.innerHTML = 'Load data<input type="file" accept="application/json,.json">';
                el.lastChild.addEventListener('change', e => this.loadDataFromEvent(e));
            },
            () => {},
            (host) => host.mode === 'modelfree'
        );

        // setup the drag&drop listeners for model free mode
        if (this.mode === 'modelfree' && this.dom.container) {
            this.dom.container.addEventListener('drop', e => this.loadDataFromEvent(e), true);
            this.dom.container.addEventListener('dragover', e => {
                e.stopPropagation();
                e.preventDefault();
            }, true);
        }
    }

    setData(data, context) {
        const setDataPromise = super.setData(data, context);

        if (this.mode === 'modelfree') {
            setDataPromise.then(() => {
                const pageHash = this.pageHash;

                this.defaultPageId = 'report';
                this.pageHash = undefined; // force update
                this.setPageHash(pageHash, true);
            });
        }

        return setDataPromise;
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
        const explicitData = typeof url === 'string' ? undefined : url;

        this.dom.loadingOverlay.classList.remove('error', 'done');

        return fetch(explicitData ? 'data:application/json,{}' : url)
            .then(res => {
                console.log(`[Discovery] Data loaded in ${Date.now() - loadStartTime}ms`);
                this.dom.loadingOverlay.innerHTML = 'Processing data...';

                return explicitData || res.json();
            })
            .then(res => {
                if (res.error) {
                    throw new Error(res.error);
                }

                let data = dataField ? res[dataField] : res;
                let context = {
                    name: 'Discovery',
                    ...dataField ? res : { data: res },
                    createdAt: dataField && res.createdAt ? new Date(Date.parse(res.createdAt)) : new Date()
                };

                this.setData(data, context);
                this.dom.loadingOverlay.classList.add('done');
            })
            .catch(e => {
                this.dom.loadingOverlay.classList.add('error');
                this.dom.loadingOverlay.innerHTML =
                    '<pre>Data loading error:<br>' + String(e).replace(/^Error:\s*Error:/, 'Error:') + '</pre>' +
                    '<button onclick="fetch(\'drop-cache\').then(() => location.reload())">Reload with no cache</button>';
                console.error('[Discovery] Data load error:', e);
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

    getRenderContext() {
        return {
            ...super.getRenderContext(),
            modelfree: this.mode === 'modelfree'
        };
    }

    renderPage() {
        document.title = this.getRenderContext().name || document.title;
        return super.renderPage();
    }
}
