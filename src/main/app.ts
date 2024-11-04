/* eslint-env browser */

import type { SetDataProgressOptions, ViewModelEvents, ViewModelOptions } from './view-model.js';
import type { LoadDataResult } from '../core/utils/load-data.js';
import type { InjectStyle } from '../core/utils/inject-styles.js';
import type { ProgressbarOptions } from '../core/utils/progressbar.js';
import type { UploadOptions } from '../extensions/upload.js';
import { hasOwn } from '../core/utils/object-utils.js';
import { createElement } from '../core/utils/dom.js';
import { syncLoaderWithProgressbar } from '../core/utils/load-data.js';
import { ViewModel } from './view-model.js';
import { Progressbar } from '../core/utils/progressbar.js';
import modelfree from '../extensions/modelfree.js';
import upload from '../extensions/upload.js';
import embed from '../extensions/embed-client.js';
import router from '../extensions/router.js';
import * as navButtons from '../nav/buttons.js';

const coalesceOption = (value: any, fallback: any) => value !== undefined ? value : fallback;

export type AppLoadingState = 'init' | 'error' | 'success';
export type AppLoadingStateOptions<T> =
    T extends 'init' ? { progressbar: Progressbar } :
    T extends 'error' ? { error: Error & { renderContent?: any }, progressbar: Progressbar } :
    undefined;

export interface AppEvents extends ViewModelEvents {
    startLoadData: [subscribe: Parameters<Progressbar['subscribe']>];
}
export interface AppOptions<T = ViewModel> extends ViewModelOptions<T> {
    mode: 'modelfree';
    router: boolean;
    upload: UploadOptions
    embed: boolean;
}
type AppOptionsBind = AppOptions; // to fix: Type parameter 'Options' has a circular default.

export class App<
    Options extends AppOptions = AppOptionsBind,
    Events extends AppEvents = AppEvents
> extends ViewModel<Options, Events> {
    declare dom: ViewModel['dom'] & {
        loadingOverlay: HTMLElement;
    };

    constructor(options: Partial<Options> = {}) {
        const extensions: typeof options.extensions = [];

        extensions.push(navButtons.darkmodeToggle);

        if (coalesceOption(options.router, true)) {
            extensions.push(router);
        }

        if (options.mode === 'modelfree') {
            extensions.push(modelfree);
        } else {
            extensions.push(navButtons.indexPage);
            extensions.push(navButtons.discoveryPage);
        }

        if (coalesceOption(options.upload, false)) {
            extensions.push(upload.setup(options.upload));
            extensions.push(navButtons.uploadFile);
        }

        if (coalesceOption(options.inspector, true)) {
            extensions.push(navButtons.inspect);
        }

        if (coalesceOption(options.embed, false)) {
            extensions.push(embed);
        }

        super({
            container: document.body,
            ...options,
            extensions: options.extensions
                ? [extensions, options.extensions]
                : extensions,
            darkmode: coalesceOption(options.darkmode, 'auto'),
            darkmodePersistent: coalesceOption(options.darkmodePersistent, true)
        });
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

                // const fragment = document.createDocumentFragment();
                // this.view
                //     .render(fragment, 'app-header:#.model', this.data, this.context)
                //     .then(() => loadingOverlayEl.prepend(fragment));

                break;
            }

            case 'success': {
                loadingOverlayEl.classList.add('done');

                break;
            }

            case 'error': {
                const error = (options as AppLoadingStateOptions<'error'>)?.error;
                const renderContext = this.getRenderContext();
                const renderData = {
                    stage: progressbar?.value.stage,
                    errorText: String(error),
                    errorMessage: error.message || String(error),
                    errorStack: (error.stack || '').replace(/^Error:\s*(\S+Error:)/, '$1')
                };
                const renderConfig = [
                    'app-header:#.model',
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
                    {
                        view: 'block',
                        className: hasOwn(error, 'renderContent')
                            ? 'warning-message'
                            : 'error-message',
                        content: [
                            {
                                view: 'block',
                                className: 'error-type-badge',
                                postRender(el: HTMLElement, config: unknown, data: any) {
                                    if (data.stage) {
                                        el.dataset.stage = ` on ${data.stage}`;
                                    }
                                }
                            },
                            'h3:errorText',
                            error.renderContent || 'text:"(see details in the console)"'
                        ]
                    }
                ];

                loadingOverlayEl.classList.add('error');
                loadingOverlayEl.replaceChildren();

                this.view.setViewRoot(loadingOverlayEl, 'AppOverlay', {
                    inspectable: false,
                    config: renderConfig,
                    data: renderData,
                    context: renderContext
                });

                this.view.render(loadingOverlayEl, renderConfig, renderData, renderContext).then(() => {
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

    initDom(styles?: InjectStyle[]) {
        super.initDom(styles);

        this.dom.container.append(
            this.dom.loadingOverlay = createElement('div', 'loading-overlay done')
        );
    }

    renderPage() {
        document.title = this.info.name || document.title;

        return super.renderPage();
    }
}
