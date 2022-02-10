/* eslint-env browser */

import Widget from '../widget/index.js';
import upload from '../core/upload.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Progressbar from '../core/utils/progressbar.js';
import {
    loadDataFromStream,
    loadDataFromFile,
    loadDataFromEvent,
    loadDataFromUrl,
    syncLoaderWithProgressbar
} from '../core/utils/load-data.js';
import * as navButtons from '../nav/buttons';

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

    progressbar(options) {
        return new Progressbar({
            delay: 200,
            domReady: this.dom.ready,
            onTiming: ({ title, duration }) =>
                console.log(`[Discovery] Data loading / ${title} – ${duration}ms`),
            ...options
        });
    }

    trackLoadDataProgress(loader) {
        const progressbar = this.progressbar();
        const containerEl = this.dom.loadingOverlay;
        containerEl.innerHTML = '';
        containerEl.append(progressbar.el);
        containerEl.classList.remove('error', 'done');
        containerEl.classList.add('init');
        this.dom.wrapper.style.opacity = 1;
        requestAnimationFrame(() => containerEl.classList.remove('init'));

        syncLoaderWithProgressbar(loader, progressbar)
            .then(({ data, context }) =>
                this.setDataProgress(data, context, progressbar)
            )
            .then(
                () => {
                    containerEl.classList.add('done');
                    return progressbar.finish();
                },
                error => {
                    // output error
                    containerEl.classList.add('error');
                    containerEl.innerHTML = [
                        '<div class="view-alert view-alert-danger">',
                        '<h3 class="view-header">Ooops, something went wrong on data loading</h3>',
                        '<pre>' + escapeHtml(error.stack || String(error)).replace(/^Error:\s*(\S+Error:)/, '$1') + '</pre>',
                        '</div>'
                    ].join('');

                    if (this.options.cache) {
                        containerEl.prepend(createElement('button', {
                            class: 'view-button',
                            async onclick() {
                                await fetch('drop-cache');
                                location.reload();
                            }
                        }, 'Reload with no cache'));
                    }
                }
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
