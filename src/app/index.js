/* eslint-env browser */

import Widget from '../widget/index.js';
import * as complexViews from '../views/index-complex.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';

const coalesceOption = (value, fallback) => value !== undefined ? value : fallback;

export default class App extends Widget {
    constructor(container, options = {}) {
        super(container, null, {
            ...options,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;
        this.download = this.options.setup.model && this.options.setup.model.download;

        this.apply(complexViews);
        this.apply(router);

        // let detachDarkMode = () => {};
        // this.nav.append({
        //     name: 'dev-dark-mode',
        //     when: () => this.darkmode.mode !== 'disabled',
        //     onClick: () => this.darkmode.toggle(true),
        //     postRender: el => {
        //         detachDarkMode();
        //         detachDarkMode = this.darkmode.on((value, mode) => {
        //             el.classList.toggle('dark', value);
        //             el.classList.toggle('auto', mode === 'auto');
        //             el.textContent = mode === 'auto' ? 'Auto light/dark' : value ? 'Dark mode' : 'Light mode';
        //         }, true);
        //     }
        // });

        let detachToggleDarkMode = () => {};
        this.nav.menu.append({
            view: 'block',
            className: 'dark-mode-switcher',
            name: 'dark-mode',
            when: '#.widget | darkmode.mode != "disabled"',
            postRender: (el, opts, data, { hide }) => {
                let selfValue;

                detachToggleDarkMode();
                detachToggleDarkMode = this.darkmode.on((value, mode) => {
                    const newValue = mode === 'auto' ? 'auto' : value;

                    if (newValue === selfValue) {
                        return;
                    }

                    el.innerHTML = '';
                    selfValue = newValue;
                    this.view.render(el, {
                        view: 'toggle-group',
                        beforeToggles: 'text:"Color schema"',
                        onChange: value => {
                            selfValue = value;
                            this.darkmode.set(value)
                            hide();
                        },
                        value: newValue,
                        data: [
                            { value: false, text: 'Light' },
                            { value: true, text: 'Dark' },
                            { value: 'auto', text: 'Auto' }
                        ]
                    }, null, { widget: this })
                }, true);
            }
        });

        if (this.mode === 'modelfree') {
            this.nav.append({
                name: 'load-data',
                content: 'text:"Load data"',
                onClick: () => createElement('input', {
                    type: 'file',
                    accept: 'application/json,.json',
                    onchange: e => this.loadDataFromEvent(e)
                }).click()
            });
        } else {
            this.nav.append({
                name: 'index-page',
                when: '#.widget | pageId != defaultPageId',
                data: '{ text: "Index", href: pageLink(#.widget.defaultPageId) }'
            });
            this.nav.append({
                name: 'report-page',
                when: '#.widget | pageId != reportPageId',
                data: '{ text: "Make report", href: pageLink(#.widget.reportPageId) }'
            });
            this.nav.menu.append({
                name: 'download',
                when: '#.widget | download',
                data: `{ text: "Download report", href: #.widget.download }`
            });
            this.nav.menu.append({
                name: 'drop-cache',
                when: '#.widget | options.cache',
                content: 'text:"Reload with no cache"',
                onClick: () => fetch('drop-cache').then(() => location.reload())
            });
            this.nav.menu.append({
                name: 'switch-model',
                when: '#.widget | mode = "multi"',
                data: { href: '..' },
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
        const repaintIfNeeded = async () => {
            if (!document.hidden) {
                await Promise.race([
                    new Promise(requestAnimationFrame),
                    new Promise(resolve => setTimeout(resolve, 16))
                ]);
            }
        }
        const process = async (name, progress, fn = () => {}) => {
            try {
                setTitle(name + '...');
                await repaintIfNeeded();
                setProgress(progress);

                return await fn();
            } finally {
                console.log(`[Discovery] ${name} in ${elapsed.time()}ms`);
                await repaintIfNeeded();
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
        await repaintIfNeeded();
        progressEl.classList.remove('init');

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
                                await repaintIfNeeded();
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
                                await repaintIfNeeded();
                            }
                        }
                    }
                })).text()
            ))
            .then(text => process('Processing data (parse)', TIME_PARSE, () =>
                explicitData || JSON.parse(text)
            ))
            .then(async res => {
                console.log('[Discovery] loadDataFromUrl() received data in', Date.now() - startTime);

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
