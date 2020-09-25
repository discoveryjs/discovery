/* eslint-env browser */

import Widget from '../widget/index.js';
import * as complexViews from '../views/index-complex.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';

export default class App extends Widget {
    constructor(container, options = {}) {
        super(container, null, options);

        this.mode = this.options.mode;

        this.apply(complexViews);
        this.apply(router);

        this.addBadge(
            'Index',
            () => this.setPage(this.defaultPageId),
            (host) => host.pageId !== this.defaultPageId && host.mode !== 'modelfree'
        );
        this.addBadge(
            'Make report',
            () => this.setPage(this.reportPageId),
            (host) => host.pageId !== this.reportPageId && host.mode !== 'modelfree'
        );
        this.addBadge(
            'Reload with no cache',
            () => fetch('drop-cache').then(() => location.reload()),
            () => this.options.cache
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
    }

    setData(data, context) {
        const setDataPromise = super.setData(data, context);

        if (this.mode === 'modelfree') {
            setDataPromise.then(() => {
                this.defaultPageId = this.reportPageId;
                this.setPageHash(this.pageHash, true);
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
            .then(async res => {
                if (explicitData) {
                    return explicitData;
                }

                const contentLength = Number(res.headers.get('content-length'));

                if (contentLength) {
                    const reader = res.body.getReader();
                    const chunks = [];
                    let recievedLength = 0;

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            break;
                        }

                        chunks.push(value);
                        recievedLength += value.length;

                        this.dom.loadingOverlay.innerHTML = `Loading data (${Math.floor((recievedLength / contentLength) * 100)}%)...`;
                    }

                    const chunksArr = new Uint8Array(recievedLength);
                    let pos = 0;

                    for (let chunk of chunks) {
                        chunksArr.set(chunk, pos);
                        pos += chunk.length;
                    }

                    return JSON.parse(new TextDecoder('utf-8').decode(chunksArr));
                } else {
                    return res.json();
                }
            })
            .then(res => {
                console.log(`[Discovery] Data loaded in ${Date.now() - loadStartTime}ms`);
                this.dom.loadingOverlay.classList.add('done');
                this.dom.loadingOverlay.innerHTML = 'Processing data...';

                if (res.error) {
                    const error = new Error(res.error);
                    error.stack = null;
                    throw error;
                }

                let data = dataField ? res[dataField] : res;
                let context = {
                    name: 'Discovery',
                    ...dataField ? res : { data: res },
                    createdAt: dataField && res.createdAt ? new Date(Date.parse(res.createdAt)) : new Date()
                };

                return this.setData(data, context);
            })
            .catch(e => {
                this.dom.loadingOverlay.classList.add('error');
                this.dom.loadingOverlay.innerHTML =
                    (this.options.cache ? '<button class="view-button" onclick="fetch(\'drop-cache\').then(() => location.reload())">Reload with no cache</button>' : '') +
                    '<pre><div class="view-alert view-alert-danger">Error loading data</div><div class="view-alert view-alert-danger">' + escapeHtml(e.stack || String(e)).replace(/^Error:\s*(\S+Error:)/, '$1') + '</div></pre>';
                console.error('[Discovery] Error loading data:', e);
            });
    }

    setContainer(container) {
        super.setContainer(container);

        if (this.dom.container) {
            this.dom.container.appendChild(
                this.dom.loadingOverlay = createElement('div', 'loading-overlay done', 'Loading data...')
            );

            // setup the drag&drop listeners for model free mode
            if (this.options.mode === 'modelfree') {
                this.dom.container.addEventListener('drop', e => this.loadDataFromEvent(e), true);
                this.dom.container.addEventListener('dragover', e => {
                    e.stopPropagation();
                    e.preventDefault();
                }, true);
            }
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
