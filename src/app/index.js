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

        if (this.mode === 'modelfree') {
            this.nav.append({
                name: 'load-data',
                onClick: () => createElement('input', {
                    type: 'file',
                    accept: 'application/json,.json',
                    onchange: e => this.loadDataFromEvent(e)
                }).click(),
                content: 'text:"Load data"'
            });
        } else {
            this.nav.append({
                name: 'index-page',
                when: () => this.pageId !== this.defaultPageId,
                onClick: () => this.setPage(this.defaultPageId),
                content: 'text:"Index"'
            });
            this.nav.append({
                name: 'report-page',
                when: () => this.pageId !== this.reportPageId,
                onClick: () => this.setPage(this.reportPageId),
                content: 'text:"Make report"'
            });
            this.nav.menu.append({
                name: 'drop-cache',
                when: () => this.options.cache,
                onClick: () => fetch('drop-cache').then(() => location.reload()),
                content: 'text:"Reload with no cache"'
            });
            this.nav.menu.append({
                name: 'switch-model',
                when: () => this.mode === 'multi',
                onClick: () => location.href = '..',
                content: 'text:"Switch model"'
            });
        }
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
        const explicitData = typeof url === 'string' ? undefined : url;
        const elapsed = {
            start: Date.now(),
            time() {
                try {
                    return Date.now() - this.start;
                } finally {
                    this.start = Date.now();
                }
            }
        };
        const setTitle = title => this.dom.loadingOverlay.textContent = title;
        const setProgress = progress => this.dom.loadingOverlay.style.setProperty('--progress', progress);
        const process = async (name, progress, fn = () => {}) => {
            try {
                setTitle(name + '...');
                await new Promise(requestAnimationFrame);
                setProgress(progress);

                return await fn();
            } finally {
                await new Promise(requestAnimationFrame);
                console.log(`[Discovery] ${name} in ${elapsed.time()}ms`);
            }
        };

        this.dom.loadingOverlay.classList.remove('error', 'done');

        return process('Awaiting data', 0, () => fetch(explicitData ? 'data:application/json,{}' : url))
            .then(async res => {
                if (explicitData) {
                    return explicitData;
                }

                const contentLength = Number(res.headers.get('content-length'));
                let decoded;

                if (contentLength) {
                    const loadedBytes = await process('Receiving data', 0, async () => {
                        const reader = res.body.getReader();
                        const chunks = [];
                        let recievedLength = 0;
                        let progress = 0;
                        let progressPercentage;
                        let prevProgressPercentage;

                        while (true) {
                            const { done, value } = await reader.read();

                            if (done) {
                                break;
                            }

                            chunks.unshift(value);
                            recievedLength += value.length;
                            progress = recievedLength / contentLength;
                            progressPercentage = Math.round(progress * 100);

                            if (progressPercentage !== prevProgressPercentage) {
                                prevProgressPercentage = progressPercentage;
                                setTitle(`Receiving data (${progressPercentage}%)...`);
                                setProgress(0.85 * progress);
                            }
                        }

                        // concat
                        let chunksArr = new Uint8Array(recievedLength);
                        let pos = 0;

                        while (chunks.length) {
                            const chunk = chunks.pop();
                            chunksArr.set(chunk, pos);
                            pos += chunk.length;
                        }

                        return chunksArr;
                    });

                    decoded = await process('Processing data (decode)', 0.9, () =>
                        new TextDecoder('utf-8').decode(loadedBytes)
                    );
                } else {
                    decoded = await process('Receiving data', 0.9, () =>
                        res.text()
                    );
                }

                return process('Processing data (parse)', 0.95, () =>
                    JSON.parse(decoded)
                );
            })
            .then(async res => {
                if (res.error) {
                    const error = new Error(res.error);
                    error.stack = null;
                    throw error;
                }

                const data = dataField ? res[dataField] : res;
                const context = {
                    name: 'Discovery',
                    ...dataField ? res : { data: res },
                    createdAt: dataField && res.createdAt ? new Date(Date.parse(res.createdAt)) : new Date()
                };

                return process('Processing data (prepare)', 1.0, () => {
                    this.dom.loadingOverlay.classList.add('done');
                    return this.setData(data, context);
                });
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
            this.dom.container.append(
                this.dom.loadingOverlay = createElement('div', 'loading-overlay done')
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
