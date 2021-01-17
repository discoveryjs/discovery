/* eslint-env browser */

import Widget from '../widget/index.js';
import router from '../core/router.js';
import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import applyContainerStyles from '../core/utils/apply-container-styles.js';
import progressbar from '../core/utils/progressbar.js';
import {
    loadDataFromStream,
    loadDataFromFile,
    loadDataFromEvent,
    loadDataFromUrl,
    loadStages
} from '../core/utils/load-data.js';

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

        this.apply(router);
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
                data: '{ text: "Download report", href: #.widget.download }'
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

        this.nav.append({
            name: 'inspect',
            content: 'html:\'<svg style="width:16px;height:16px;vertical-align:top;margin:1px -7px 0;opacity:.85" viewBox="1 -1 30 30"><path fill="currentColor" d="M 15 2 C 8.3844239 2 3 7.3844287 3 14 C 3 20.615571 8.3844239 26 15 26 L 25 26 C 26.105 26 27 25.105 27 24 L 27 14 C 27 7.3844287 21.615576 2 15 2 z M 15 4 C 20.534697 4 25 8.465307 25 14 C 25 19.534693 20.534697 24 15 24 C 9.4653034 24 5 19.534693 5 14 C 5 8.465307 9.4653034 4 15 4 z M 15.953125 6.9863281 A 1.0001 1.0001 0 0 0 15.013672 7.8359375 L 13.013672 19.835938 A 1.0001 1.0001 0 1 0 14.986328 20.164062 L 16.986328 8.1640625 A 1.0001 1.0001 0 0 0 15.953125 6.9863281 z M 10.980469 9.9882812 A 1.0001 1.0001 0 0 0 10.167969 10.445312 L 8.1679688 13.445312 A 1.0001 1.0001 0 0 0 8.1679688 14.554688 L 10.167969 17.554688 A 1.0001 1.0001 0 1 0 11.832031 16.445312 L 10.201172 14 L 11.832031 11.554688 A 1.0001 1.0001 0 0 0 10.980469 9.9882812 z M 18.988281 9.9882812 A 1.0001 1.0001 0 0 0 18.167969 11.554688 L 19.798828 14 L 18.167969 16.445312 A 1.0001 1.0001 0 1 0 19.832031 17.554688 L 21.832031 14.554688 A 1.0001 1.0001 0 0 0 21.832031 13.445312 L 19.832031 10.445312 A 1.0001 1.0001 0 0 0 18.988281 9.9882812 z"></path></svg>\'',
            onClick: () => this.inspectMode.set(!this.inspectMode.value),
            postRender(el) {
                el.title = 'Enable view inspection. Use Alt + click for quick inspection';
            }
        });
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

    progressbar(...args) {
        return progressbar(...args);
    }

    trackLoadDataProgress({ result, state, timing }) {
        if (this.cancelTrackLoadDataProgress) {
            this.cancelTrackLoadDataProgress();
        }

        const progressbar = this.progressbar(state);
        const containerEl = this.dom.loadingOverlay;
        containerEl.append(progressbar.el);
        containerEl.classList.remove('error', 'done');
        containerEl.classList.add('init');
        requestAnimationFrame(() => containerEl.classList.remove('init'));

        const subscriptions = [
            progressbar.dispose,
            timing.subscribe(({ stage, elapsed }) =>
                console.log(`[Discovery] Data loading / ${loadStages[stage].title} - ${elapsed}ms`)
            )
        ];

        this.cancelTrackLoadDataProgress = () => {
            for (const unsubscribe of subscriptions) {
                unsubscribe();
            }
        };

        // output error
        result.then(
            () => {
                containerEl.classList.add('done');
            },
            error => {
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

        return result
            .finally(this.cancelTrackLoadDataProgress);
    }

    loadDataFromStream(stream, totalSize) {
        return this.trackLoadDataProgress(loadDataFromStream(
            () => ({ stream, totalSize }),
            this.setData.bind(this)
        ));
    }

    loadDataFromEvent(event) {
        return this.trackLoadDataProgress(loadDataFromEvent(
            event,
            this.setData.bind(this)
        ));
    }

    loadDataFromFile(file) {
        return this.trackLoadDataProgress(loadDataFromFile(
            file,
            this.setData.bind(this)
        ));
    }

    loadDataFromUrl(url, dataField) {
        return this.trackLoadDataProgress(loadDataFromUrl(
            url,
            this.setData.bind(this),
            dataField
        ));
    }

    initDom() {
        super.initDom();

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
