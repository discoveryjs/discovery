/* eslint-env browser */

import Widget from '../widget/index.js';
import upload from '../extensions/upload.js';
import router from '../extensions/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Progressbar from '../core/utils/progressbar.js';
import * as navButtons from '../nav/buttons';
import {
    loadDataFromStream,
    loadDataFromFile,
    loadDataFromEvent,
    loadDataFromUrl,
    syncLoaderWithProgressbar
} from '../core/utils/load-data.js';

const coalesceOption = (value, fallback) => value !== undefined ? value : fallback;

export default class App extends Widget {
    constructor(container, options = {}) {
        const extensions = options.extensions ? [options.extensions] : [];
        const isModelfree = options.mode === 'modelfree';

        extensions.push(navButtons.darkmodeToggle);

        if (coalesceOption(options.router, true)) {
            extensions.push(router);
        }

        if (!isModelfree) {
            extensions.push(navButtons.indexPage);
            extensions.push(navButtons.reportPage);
        }

        if (coalesceOption(options.upload, false) || isModelfree) {
            extensions.push(upload);
            extensions.push(navButtons.loadData);
        }

        if (coalesceOption(options.inspector, true)) {
            extensions.push(navButtons.inspect);
        }

        super(container, null, {
            ...options,
            extensions: options.extensions ? extensions.concat(options.extensions) : extensions,
            upload: options.upload,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;
    }

    setLoadingState(state, { error, progressbar } = {}) {
        const loadingOverlayEl = this.dom.loadingOverlay;

        switch (state) {
            case 'init': {
                if (progressbar.initedFor === this) {
                    return;
                }

                loadingOverlayEl.classList.remove('error', 'done');
                loadingOverlayEl.classList.add('init');
                requestAnimationFrame(() => loadingOverlayEl.classList.remove('init'));

                loadingOverlayEl.innerHTML = '';
                loadingOverlayEl.append(progressbar.el);
                progressbar.initedFor = this;

                break;
            }

            case 'success': {
                loadingOverlayEl.classList.add('done');

                break;
            }

            case 'error': {
                loadingOverlayEl.classList.add('error');
                loadingOverlayEl.innerHTML = '';

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
                            'h3:"Ooops, something went wrong on data loading"',
                            'html:`<pre>${errorText}</pre>`'
                        ]
                    }
                ], {
                    options: this.options,
                    errorText: escapeHtml(error.stack || String(error)).replace(/^Error:\s*(\S+Error:)/, '$1')
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
        if (this.mode === 'modelfree' && this.defaultPageId !== this.reportPageId) {
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

    loadDataFromUrl(url, dataField, options) {
        return this.trackLoadDataProgress(loadDataFromUrl(url, dataField, options));
    }

    unloadData() {
        if (this.dataLoaded && this.mode === 'modelfree' && this._defaultPageId !== this.defaultPageId) {
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
