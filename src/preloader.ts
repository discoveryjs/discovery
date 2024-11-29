import type { ColorSchemeState } from './core/darkmode.js';
import type { InjectStyle } from './core/utils/inject-styles.js';
import type { LoadDataBaseOptions, LoadDataFetchOptions, LoadDataFromPush, LoadDataResult } from './core/utils/load-data.js';
import type { EmbedHostToClientPostponeMessage, EmbedHostToPreinitMessage, EmbedPreinitToHostMessage } from './extensions/embed-message.types.js';
import { hasOwn } from './core/utils/object-utils.js';
import { randomId } from './core/utils/id.js';
import { resolveColorSchemeValue } from './core/darkmode.js';
import { applyContainerStyles } from './core/utils/container-styles.js';
import { injectStyles } from './core/utils/inject-styles.js';
import { dataSource, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import { Progressbar } from './core/utils/progressbar.js';

export type PreloaderOptions = {
    dataSource: keyof typeof dataSource;
    container: HTMLElement;
    styles: InjectStyle[];
    darkmode: ColorSchemeState;
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

function validateDataSourceType(dataSourceType: any) {
    if (dataSourceType && !hasOwn(dataSource, dataSourceType)) {
        throw new Error(`dataSource "${dataSourceType}" is not supported`);
    }
}

function applyStyles(el: HTMLElement, container: HTMLElement, options: Partial<PreloaderOptions>) {
    const darkmode = resolveColorSchemeValue(options.darkmode, options.darkmodePersistent);

    applyContainerStyles(container, darkmode);

    if (darkmode) {
        el.setAttribute('darkmode', '');
    }
}

export function preloader(options: Partial<PreloaderOptions>) {
    options = options || {};

    const container = options.container || document.body;
    const el = document.createElement('div');
    const shadowRoot = el.attachShadow({ mode: 'open' });
    const dataSourceType = options.dataSource;

    validateDataSourceType(dataSourceType);
    applyStyles(el, container, options);

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
        const { start, push, finish } = loading as LoadDataFromPush;

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
    const postponeMessages: EmbedHostToClientPostponeMessage[] = [];
    const sendMessage = <T extends EmbedPreinitToHostMessage['type']>(
        type: T,
        payload: Extract<EmbedPreinitToHostMessage, { type: T }>['payload']
    ) => {
        // console.log('[post-message]', type, payload);
        const message: EmbedPreinitToHostMessage = {
            from: 'discoveryjs-app',
            id: hostId,
            type,
            payload
        } as EmbedPreinitToHostMessage;

        parentWindow.postMessage(message, '*');
    };

    const sendDestroyMessage = () => sendMessage('destroy', null);
    const processIncomingMessage = (event: MessageEvent<EmbedHostToPreinitMessage>) => {
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
