/* eslint-env browser */

import type { SetDataProgressOptions, WidgetEvents, WidgetOptions } from './widget.js';
import type { LoadDataBaseOptions, LoadDataResult } from '../core/utils/load-data.js';
import type { Style } from '../core/utils/inject-styles.js';
import { Widget } from './widget.js';
import { syncLoaderWithProgressbar } from '../core/utils/load-data.js';
import Progressbar, { ProgressbarOptions } from '../core/utils/progressbar.js';
import upload, { UploadOptions } from '../extensions/upload.js';
import embed from '../extensions/embed-client.js';
import router from '../extensions/router.js';
import * as navButtons from '../nav/buttons.js';
import { createElement } from '../core/utils/dom.js';

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

        this.mode = options.mode;
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

                loadingOverlayEl.replaceChildren(progressbar?.el || '');

                break;
            }

            case 'success': {
                loadingOverlayEl.classList.add('done');

                break;
            }

            case 'error': {
                const error = (options as AppLoadingStateOptions<'error'>)?.error;

                loadingOverlayEl.classList.add('error');
                loadingOverlayEl.replaceChildren();

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
                    stage: progressbar?.value.stage,
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
            domReady: this.dom.ready,
            onFinish: (timings) => this.log({
                level: 'perf',
                message: `${options.title || 'Load data'} (${timings[timings.length - 1].duration}ms)`,
                collapsed: () => [
                    ...timings.map(timing => `${timing.title}: ${timing.duration}ms`),
                    `(await repaint: ${timings.awaitRepaintPenaltyTime}ms)`
                ]
            }),
            ...options
        });
    }

    async trackLoadDataProgress(loadDataResult: LoadDataResult) {
        const progressbar = this.progressbar({ title: loadDataResult.title });

        this.setLoadingState('init', { progressbar });
        this.emit('startLoadData', progressbar.subscribe.bind(progressbar));

        syncLoaderWithProgressbar(loadDataResult, progressbar).then(
            dataset => this.setDataProgress(dataset.data, null, { dataset, progressbar }),
            error => this.setLoadingState('error', { error, progressbar })
        );

        await loadDataResult.dataset;
    }

    loadDataFromEvent(event: DragEvent | InputEvent, options?: LoadDataBaseOptions) {
        if (this.mode === 'modelfree' && this.defaultPageId !== this.discoveryPageId) {
            this._defaultPageId = this.defaultPageId;
            this.defaultPageId = this.discoveryPageId;
            this.setPageHash(this.pageHash, true);
            this.cancelScheduledRender();
        }

        return super.loadDataFromEvent(event, options);
    }

    unloadData() {
        if (this.hasDatasets() && this.mode === 'modelfree' && this._defaultPageId !== this.defaultPageId) {
            this.defaultPageId = this._defaultPageId as string;
            this.setPageHash(this.pageHash, true);
            this.cancelScheduledRender();
        }

        super.unloadData();
    }

    initDom(styles?: Style[]) {
        super.initDom(styles);

        this.dom.container.append(
            this.dom.loadingOverlay = createElement('div', 'loading-overlay done')
        );
    }

    renderPage() {
        document.title = this.getRenderContext().name || document.title;

        return super.renderPage();
    }
}
