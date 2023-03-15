/* eslint-env browser */

import Widget from '../widget/index.js';
import upload from '../extensions/upload.js';
import embed from '../extensions/embed-client.js';
import router from '../extensions/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Progressbar from '../core/utils/progressbar.js';
import * as navButtons from '../nav/buttons.js';
import {
    loadDataFromStream,
    loadDataFromFile,
    loadDataFromEvent,
    loadDataFromUrl,
    syncLoaderWithProgressbar
} from '../core/utils/load-data.js';

const coalesceOption = (value, fallback) => value !== undefined ? value : fallback;

export default class App extends Widget {
    constructor(options = {}) {
        const extensions = options.extensions ? [options.extensions] : [];

        extensions.push(navButtons.darkmodeToggle);

        if (coalesceOption(options.router, true)) {
            extensions.push(router);
        }

        if (options.mode !== 'modelfree') {
            extensions.push(navButtons.indexPage);
            extensions.push(navButtons.reportPage);
        }

        if (coalesceOption(options.upload, false)) {
            extensions.push(upload.setup(options.upload));
            extensions.push(navButtons.loadData);
        }

        if (coalesceOption(options.embed, false)) {
            extensions.push(embed);
        }

        if (coalesceOption(options.inspector, true)) {
            extensions.push(navButtons.inspect);
        }

        super({
            container: document.body,
            ...options,
            extensions: options.extensions ? extensions.concat(options.extensions) : extensions,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;
    }

    setLoadingState(state, { error, progressbar } = {}) {
        const loadingOverlayEl = this.dom.loadingOverlay;

        switch (state) {
            case 'init': {
                loadingOverlayEl.classList.remove('error', 'done');

                // if progressbar already has parent element -> do nothing
                if (progressbar.el.parentNode) {
                    return;
                }

                loadingOverlayEl.innerHTML = '';
                loadingOverlayEl.append(progressbar.el);
                loadingOverlayEl.classList.add('init');
                requestAnimationFrame(() => loadingOverlayEl.classList.remove('init'));

                break;
            }

            case 'success': {
                loadingOverlayEl.classList.add('done');

                break;
            }

            case 'error': {
                loadingOverlayEl.classList.add('error');
                loadingOverlayEl.innerHTML = '';

                console.error(error);
                this.view.render(loadingOverlayEl, [
                    {
                        view: 'block',
                        className: 'action-buttons',
                        content: [
                            {
                                view: 'preset/upload',
                                when: this.preset.isDefined('upload')
                            }
                        ]
                    },
                    error.renderContent || {
                        view: 'alert-danger',
                        content: [
                            {
                                view: 'h3',
                                content: [
                                    'badge:"Error"',
                                    'text:errorText'
                                ]
                            },
                            'text:"(see details in the console)"'
                        ]
                    }
                ], {
                    options: this.options,
                    errorText: escapeHtml(error.message || String(error)),
                    errorStack: error.stack ? escapeHtml(error.stack).replace(/^Error:\s*(\S+Error:)/, '$1') : ''
                }, {
                    actions: this.actions
                }).then(() => {
                    if (progressbar?.onErrorRender) {
                        progressbar.onErrorRender(error, loadingOverlayEl);
                    }
                });

                break;
            }
        }
    }

    async setDataProgress(data, context, progressbar = this.progressbar({ title: 'Set data' })) {
        try {
            this.setLoadingState('init', { progressbar });
            await super.setDataProgress(data, context, progressbar);
            this.setLoadingState('success');
        } catch (error) {
            this.setLoadingState('error', { error, progressbar });
        }
    }

    progressbar(options) {
        return new Progressbar({
            delay: 200,
            domReady: this.dom.ready,
            onFinish(timings) {
                console.groupCollapsed(`[Discovery] ${
                    options.title || 'Load data'
                } (${
                    timings[timings.length - 1].duration
                }ms)`);

                for (const timing of timings) {
                    console.log(`${timing.title}: ${timing.duration}ms`);
                }

                console.groupEnd();
            },
            ...options
        });
    }

    trackLoadDataProgress(loader) {
        const progressbar = this.progressbar({ title: loader.title });

        this.setLoadingState('init', { progressbar });

        syncLoaderWithProgressbar(loader, progressbar).then(
            ({ data, context }) => this.setDataProgress(data, context, progressbar),
            error => this.setLoadingState('error', { error, progressbar })
        );

        return loader.result;
    }

    loadDataFromStream(stream, totalSize) {
        return this.trackLoadDataProgress(loadDataFromStream(
            () => ({ stream, totalSize })
        ));
    }

    loadDataFromEvent(event) {
        if (this.options.mode === 'modelfree' && this.defaultPageId !== this.reportPageId) {
            this._defaultPageId = this.defaultPageId;
            this.defaultPageId = this.reportPageId;
            this.setPageHash(this.pageHash, true);
            this.cancelScheduledRender();
        }

        return this.trackLoadDataProgress(loadDataFromEvent(event));
    }

    loadDataFromFile(file) {
        return this.trackLoadDataProgress(loadDataFromFile(file));
    }

    loadDataFromUrl(url, options) {
        return this.trackLoadDataProgress(loadDataFromUrl(url, options));
    }

    unloadData() {
        if (this.dataLoaded && this.options.mode === 'modelfree' && this._defaultPageId !== this.defaultPageId) {
            this.defaultPageId = this._defaultPageId;
            this.setPageHash(this.pageHash, true);
            this.cancelScheduledRender();
        }

        super.unloadData();
    }

    initDom() {
        super.initDom();

        this.dom.container.append(
            this.dom.loadingOverlay = createElement('div', 'loading-overlay done')
        );
    }

    renderPage() {
        document.title = this.getRenderContext().name || document.title;

        return super.renderPage();
    }
}
