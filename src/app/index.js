/* eslint-env browser */

import Widget from '../widget/index.js';
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
    static modelfreeLoadData(instance, event) {
        if (instance.defaultPageId !== instance.reportPageId) {
            instance.defaultPageId = instance.reportPageId;
            instance.setPageHash(instance.pageHash, true);
            instance.cancelScheduledRender();
        }

        return instance.loadDataFromEvent(event);
    }

    constructor(container, options = {}) {
        const extensions = options.extensions ? [options.extensions] : [];

        if (coalesceOption(options.router, true)) {
            extensions.push(router);
        }

        extensions.push(navButtons.darkmodeToggle);

        if (options.mode === 'modelfree') {
            extensions.push(navButtons.loadData);
        } else {
            extensions.push(navButtons.indexPage);
            extensions.push(navButtons.reportPage);
        }

        if (coalesceOption(options.inspector, true)) {
            extensions.push(navButtons.inspect);
        }

        super(container, null, {
            ...options,
            extensions: options.extensions ? extensions.concat(options.extensions) : extensions,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;
    }

    progressbar(options) {
        return new Progressbar({
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
                async () => {
                    containerEl.classList.add('done');
                    await progressbar.setState({ stage: 'done' });
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
        return this.trackLoadDataProgress(loadDataFromEvent(event));
    }

    loadDataFromFile(file) {
        return this.trackLoadDataProgress(loadDataFromFile(file));
    }

    loadDataFromUrl(url, dataField, options) {
        return this.trackLoadDataProgress(loadDataFromUrl(url, dataField, options));
    }

    initDom() {
        super.initDom();

        this.dom.container.append(
            this.dom.loadingOverlay = createElement('div', 'loading-overlay done')
        );

        // setup the drag&drop listeners for model free mode
        if (this.options.mode === 'modelfree') {
            this.dom.container.addEventListener('drop', event => this.constructor.modelfreeLoadData(this, event), true);
            this.dom.container.addEventListener('dragover', event => {
                event.stopPropagation();
                event.preventDefault();
            }, true);
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
