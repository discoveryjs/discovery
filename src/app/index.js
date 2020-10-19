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

        this.download = this.options.setup.model && this.options.setup.model.download;

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
            this.nav.append({
                name: 'dark-mode',
                onClick: () => {
                    (this.darkmode = !this.darkmode)
                        ? this.dom.container.dataset.darkmode = true
                        : delete this.dom.container.dataset.darkmode;
                    this.nav.render();
                },
                content: {
                    view: 'text',
                    data: '#.widget.darkmode ? "Light mode" : "Dark mode"'
                }
            })
            this.nav.menu.append({
                name: 'download',
                when: () => this.download,
                data: `{text:"Download report",href:"${this.download}"}`
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

    async loadDataFromUrl(url, dataField) {
        const TIME_RECIEVE_DATA = 0.9;
        const TIME_PARSE = 0.95;
        const TIME_PREPARE = 1.0;
        const progressEl = this.dom.loadingOverlay;
        const explicitData = typeof url === 'string' ? undefined : url;
        const startTime = Date.now();
        const setTitle = title => progressEl.querySelector('.title').textContent = title;
        const setProgress = progress => progressEl.style.setProperty('--progress', progress);
        const process = async (name, progress, fn = () => {}) => {
            try {
                setTitle(name + '...');
                await new Promise(requestAnimationFrame);
                setProgress(progress);

                return await fn();
            } finally {
                console.log(`[Discovery] ${name} in ${elapsed.time()}ms`);
                await new Promise(requestAnimationFrame);
            }
        };
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

        progressEl.innerHTML = '<div class="title"></div><div class="progress"></div>';
        progressEl.classList.remove('error', 'done');
        progressEl.classList.add('init');
        requestAnimationFrame(() => progressEl.classList.remove('init'));

        return process('Awaiting data', 0, () => fetch(explicitData ? 'data:application/json,{}' : url))
            .then(response => process('Receiving data', 0, () =>
                new Response(new ReadableStream({
                    async start(controller) {
                        const totalSize =
                            Number(response.headers.get('x-file-size')) ||
                            (!response.headers.get('content-encoding') && Number(response.headers.get('x-file-size')));
                        const reader = response.body.getReader();
                        const streamStartTime = Date.now();
                        let loadedSize = 0;
                        let progress = 0;
                        let progressLabel;
                        let prevProgressLabel;
                        let prevProgressTime = Date.now();

                        while (true) {
                            const { done, value } = await reader.read();

                            if (done) {
                                setProgress(TIME_RECIEVE_DATA);
                                await new Promise(requestAnimationFrame);
                                controller.close();
                                break;
                            }

                            controller.enqueue(value);
                            loadedSize += value.length;

                            if (totalSize) {
                                progress = loadedSize / totalSize;
                                progressLabel = Math.round(progress * 100) + '%';
                            } else {
                                progress = 0.1 + Math.min(0.9, (Date.now() - streamStartTime) / 20000);
                                progressLabel = (loadedSize / (1024 * 1024)).toFixed(1) + 'MB';
                            }

                            if (progressLabel !== prevProgressLabel && (progress === 1.0 || Date.now() - prevProgressTime > 50)) {
                                prevProgressTime = Date.now();
                                prevProgressLabel = progressLabel;
                                setTitle(`Receiving data (${progressLabel})...`);
                                setProgress(TIME_RECIEVE_DATA * progress);
                                await new Promise(requestAnimationFrame);
                            }
                        }
                    }
                })).text()
            ))
            .then(text => process('Processing data (parse)', TIME_PARSE, () =>
                explicitData || JSON.parse(text)
            ))
            .then(async res => {
                console.log('[Discovery] loadDataFromUrl() done in', Date.now() - startTime);

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

                await process('Processing data (prepare)', TIME_PREPARE, () =>
                    this.setData(data, context)
                );

                progressEl.classList.add('done');
            })
            .catch(e => {
                progressEl.classList.add('error');
                progressEl.innerHTML =
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
