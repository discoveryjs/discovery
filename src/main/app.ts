/* eslint-env browser */

import { SetDataProgressOptions, Widget, WidgetEvents, WidgetOptions } from './widget.js';
import upload, { UploadOptions } from '../extensions/upload.js';
import embed from '../extensions/embed-client.js';
import router from '../extensions/router.js';
import { createElement } from '../core/utils/dom.js';
import Progressbar, { ProgressbarOptions, loadStages } from '../core/utils/progressbar.js';
import * as navButtons from '../nav/buttons.js';
import { syncLoaderWithProgressbar } from '../core/utils/load-data.js';
import { LoadDataBaseOptions, LoadDataResult } from '../core/utils/load-data.types.js';

const coalesceOption = (value: any, fallback: any) => value !== undefined ? value : fallback;

export type AppLoadingState = 'init' | 'error' | 'success';
export type AppLoadingStateOptions<T> =
    T extends 'init' ? { progressbar: Progressbar } :
    T extends 'error' ? { error: Error & { renderContent?: any }, progressbar: Progressbar } :
    undefined;

export interface AppEvents extends WidgetEvents {
    startLoadData: [subscribe: Parameters<Progressbar['subscribe']>];
}
export interface AppOptions<T = Widget> extends WidgetOptions<T> {
    mode: 'modelfree';
    router: boolean;
    upload: UploadOptions
    embed: boolean;
}
type AppOptionsBind = AppOptions; // to fix: Type parameter 'Options' has a circular default.

export class App<
    Options extends AppOptions = AppOptionsBind,
    Events extends AppEvents = AppEvents
> extends Widget<Options, Events> {
    mode: string | undefined;
    _defaultPageId: string | undefined;
    declare dom: Widget['dom'] & {
        loadingOverlay: HTMLElement;
    };

    constructor(options: Partial<Options> = {}) {
        const extensions = options.extensions ? [options.extensions] : [];

        extensions.push(navButtons.darkmodeToggle);

        if (coalesceOption(options.router, true)) {
            extensions.push(router);
        }

        if (options.mode !== 'modelfree') {
            extensions.push(navButtons.indexPage);
            extensions.push(navButtons.discoveryPage);
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
            extensions,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });

        this.mode = this.options.mode;
    }

    setLoadingState<S extends AppLoadingState>(state: S, options?: AppLoadingStateOptions<S>) {
        const loadingOverlayEl = this.dom.loadingOverlay;
        const { progressbar } = options || {};

        switch (state) {
            case 'init': {
                loadingOverlayEl.classList.remove('error', 'done');

                // if progressbar already has parent element -> do nothing
                if (progressbar?.el.parentNode) {
                    return;
                }

                loadingOverlayEl.innerHTML = '';
                loadingOverlayEl.append(progressbar?.el || '');
                loadingOverlayEl.classList.add('init');
                requestAnimationFrame(() => loadingOverlayEl.classList.remove('init'));

                break;
            }

            case 'success': {
                loadingOverlayEl.classList.add('done');

                break;
            }

            case 'error': {
                const error = (options as AppLoadingStateOptions<'error'>)?.error;

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
                            {
                                view: 'h3',
                                content: [
                                    'badge:"Error"',
                                    { view: 'text', when: 'stage', data: '`[${stage}] `' },
                                    'text:errorText'
                                ]
                            },
                            'text:"(see details in the console)"'
                        ]
                    }
                ], {
                    stage: progressbar?.lastStage,
                    errorText: error.message || String(error),
                    errorStack: (error.stack || '').replace(/^Error:\s*(\S+Error:)/, '$1')
                }, {
                    actions: this.action.actionMap
                }).then(() => {
                    this.log('error', error);
                    progressbar?.setState({ error });
                });

                break;
            }
        }
    }

    async setDataProgress(data: unknown, context: unknown, options?: SetDataProgressOptions) {
        const dataset = options?.dataset;
        const progressbar = options?.progressbar || this.progressbar({ title: 'Set data' });

        try {
            this.setLoadingState('init', { progressbar });
            await super.setDataProgress(data, context, { dataset, progressbar });
            this.setLoadingState('success');
        } catch (error) {
            this.setLoadingState('error', { error, progressbar });
        }
    }

    progressbar(options: ProgressbarOptions & { title?: string }) {
        return new Progressbar({
            delay: 200,
            domReady: this.dom.ready,
            onFinish: (timings) => this.log({
                level: 'perf',
                message: `${options.title || 'Load data'} (${timings[timings.length - 1].duration}ms)`,
                collapsed: () => timings.map(timing => `${timing.title}: ${timing.duration}ms`)
            }),
            ...options
        });
    }

    async trackLoadDataProgress(loadDataResult: LoadDataResult) {
        const currentStage = loadDataResult.state.value.stage;
        const progressbar = this.progressbar({ title: loadStages[currentStage].title });

        this.setLoadingState('init', { progressbar });
        this.emit('startLoadData', progressbar.subscribe.bind(progressbar));

        syncLoaderWithProgressbar(loadDataResult, progressbar).then(
            (dataset) => this.setDataProgress(dataset.data, null, { dataset, progressbar }),
            error => this.setLoadingState('error', { error, progressbar })
        );

        await loadDataResult.dataset;
    }

    loadDataFromEvent(event: DragEvent | InputEvent, options?: LoadDataBaseOptions) {
        if (this.options.mode === 'modelfree' && this.defaultPageId !== this.discoveryPageId) {
            this._defaultPageId = this.defaultPageId;
            this.defaultPageId = this.discoveryPageId;
            this.setPageHash(this.pageHash, true);
            this.cancelScheduledRender();
        }

        return super.loadDataFromEvent(event, options);
    }

    unloadData() {
        if (this.hasDatasets() && this.options.mode === 'modelfree' && this._defaultPageId !== this.defaultPageId) {
            this.defaultPageId = this._defaultPageId as string;
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
