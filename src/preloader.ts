import Progressbar from './core/utils/progressbar.js';
import { dataSource, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import { applyContainerStyles } from './core/utils/container-styles.js';
import injectStyles, { Style } from './core/utils/inject-styles.js';
import { randomId } from './core/utils/id.js';
import type { InitValue } from './core/darkmode.js';
import type { LoadDataBaseOptions, LoadDataFetchOptions, LoadDataResult } from './core/utils/load-data.js';

type PushDataLoading = ReturnType<typeof dataSource['push']>;
export type PreloaderOptions = {
    dataSource: keyof typeof dataSource;
    container: HTMLElement;
    styles: Style[];
    darkmode: InitValue;
    darkmodePersistent: boolean;
    embed: boolean;
    progressbar: Progressbar;
    loadDataOptions: LoadDataBaseOptions | LoadDataFetchOptions;
    data: any;
};

function createProgressbar(domReady: Promise<void>) {
    return new Progressbar({
        domReady,
        onTiming: ({ title, duration }) =>
            console.log(`[Discovery/preloader] ${title} – ${duration}ms`)
    });
}

export function preloader(options: Partial<PreloaderOptions>) {
    options = options || {};
    const dataSourceType = options.dataSource;

    if (dataSourceType && !dataSource.hasOwnProperty(dataSourceType)) {
        throw new Error(`dataSource "${dataSourceType}" is not supported`);
    }

    const container = options.container || document.body;
    const el = document.createElement('div');
    const shadowRoot = el.attachShadow({ mode: 'open' });

    const darkmode = applyContainerStyles(container, options);

    if (darkmode) {
        el.setAttribute('darkmode', '');
    }

    const optionsData = options.data;
    const loading = optionsData
        ? dataSourceType === 'push'
            ? dataSource.push(options.loadDataOptions)
            : dataSource[dataSourceType || 'url'](options.data, options.loadDataOptions)
        : {
            dataset: Promise.resolve(),
            state: undefined
        };

    if (optionsData && dataSourceType === 'push') {
        const { start, push, finish } = loading as PushDataLoading;

        globalThis.discoveryLoader = {
            start,
            push,
            finish(...args: Parameters<typeof finish>) {
                delete globalThis.discoveryLoader;
                finish(...args);
            }
        };
    }

    const domReady = injectStyles(shadowRoot, options.styles);
    const progressbar = options.progressbar || createProgressbar(domReady);
    const disposeEmbed = options.embed ? initPreloadEmbedApi(loading.state) : () => {};

    if (loading.state) {
        syncLoaderWithProgressbar(loading, progressbar).catch(() => {});
    }

    shadowRoot.append(progressbar.el);
    container.append(el);

    return Object.assign(
        loading.dataset,
        { el, shadowRoot, progressbar, disposeEmbed }
    );
}

function initPreloadEmbedApi(loadingState?: LoadDataResult['state']) {
    const hostId = randomId();
    const parentWindow = window.parent;
    const postponeMessages: unknown[] = [];
    const sendMessage = (type: string, payload: any = null) => {
        // console.log('[post-message]', type, payload);
        parentWindow.postMessage({
            from: 'discoveryjs-app',
            id: hostId,
            type,
            payload
        }, '*');
    };

    const sendDestroyMessage = () => sendMessage('destroy');
    const processIncomingMessage = (event: MessageEvent) => {
        const { id, type } = event.data || {};

        if (id === hostId) {
            switch (type) {
                case 'defineAction':
                case 'setPageHash':
                case 'setRouterPreventLocationUpdate': {
                    postponeMessages.push(event.data);
                    break;
                }

                default:
                    console.error(`[Discovery/preloader] Unknown preload message type "${type}"`);
            }
        }
    };

    // if no parent then host's document doesn't embeded into another document (e.g. <iframe>)
    if (parentWindow === window) {
        return;
    }

    addEventListener('message', processIncomingMessage, false);
    addEventListener('unload', sendDestroyMessage, false);
    sendMessage('preinit', {
        page: {
            hash: location.hash || '#'
        }
    });

    const unsubscribeLoading = loadingState
        ? loadingState.subscribeSync((loadDataState) => {
            const { stage } = loadDataState;

            if (stage === 'error' || stage === 'received') {
                unsubscribeLoading();
            }

            return sendMessage('loadingState', loadDataState);
        })
        : () => {};

    return () => {
        removeEventListener('message', processIncomingMessage, false);
        removeEventListener('unload', sendDestroyMessage, false);

        unsubscribeLoading();
        sendDestroyMessage();

        return {
            hostId,
            postponeMessages
        };
    };
}
