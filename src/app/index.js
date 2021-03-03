/* eslint-env browser */

import Widget from '../widget/index.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import applyContainerStyles from '../core/utils/apply-container-styles.js';
import Progressbar from '../core/utils/progressbar.js';
import {
    loadDataFromStream,
    loadDataFromFile,
    loadDataFromEvent,
    loadDataFromUrl,
    syncLoaderWithProgressbar
} from '../core/utils/load-data.js';

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
        super(container, null, {
            ...options,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;

        if (coalesceOption(this.options.router, true)) {
            this.apply(router);
        }

        // FIXME: should not apply styles by default
        this.darkmode.subscribe(darkmode => applyContainerStyles(this.dom.wrapper.parentNode, { darkmode }));

        // let detachDarkMode = () => {};
        // this.nav.append({
        //     name: 'dev-dark-mode',
        //     when: () => this.darkmode.mode !== 'disabled',
        //     onClick: () => this.darkmode.toggle(true),
        //     postRender: el => {
        //         detachDarkMode();
        //         detachDarkMode = this.darkmode.subscribe((value, mode) => {
        //             el.classList.toggle('dark', value);
        //             el.classList.toggle('auto', mode === 'auto');
        //             el.textContent = mode === 'auto' ? 'Auto light/dark' : value ? 'Dark mode' : 'Light mode';
        //         }, true);
        //     }
        // });

        let detachToggleDarkMode = () => {};
        this.nav.menu.append({
            view: 'block',
            className: ['toggle-menu-item', 'dark-mode-switcher'],
            name: 'dark-mode',
            when: '#.widget | darkmode.mode != "disabled"',
            postRender: (el, opts, data, { hide }) => {
                let selfValue;

                detachToggleDarkMode();
                detachToggleDarkMode = this.darkmode.subscribe((value, mode) => {
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
                            this.darkmode.set(value);
                            hide();
                        },
                        value: newValue,
                        data: [
                            { value: false, text: 'Light' },
                            { value: true, text: 'Dark' },
                            { value: 'auto', text: 'Auto' }
                        ]
                    }, null, { widget: this });
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
                    onchange: event => this.constructor.modelfreeLoadData(this, event)
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
        }

        if (coalesceOption(this.options.inspector, true)) {
            this.nav.append({
                name: 'inspect',
                onClick: () => this.inspectMode.set(!this.inspectMode.value),
                postRender(el) {
                    el.title = 'Enable view inspection. Use Alt + click for quick inspection';
                }
            });
        }
    }

    progressbar(...args) {
        return new Progressbar(...args);
    }

    trackLoadDataProgress(loader) {
        const progressbar = this.progressbar({
            onTiming: ({ title, duration }) =>
                console.log(`[Discovery] Data loading / ${title} – ${duration}ms`)
        });

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

    loadDataFromUrl(url, dataField) {
        return this.trackLoadDataProgress(loadDataFromUrl(url, dataField));
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
