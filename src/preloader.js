import Progressbar from './core/utils/progressbar.js';
import { dataSource, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import { applyContainerStyles } from './core/utils/container-styles.js';
import injectStyles from './core/utils/inject-styles.js';
import { randomId } from './core/utils/id.js';

function createProgressbar(domReady, title) {
    return new Progressbar({
        delay: 300,
        domReady,
        title,
        onTiming: ({ title, duration }) =>
            console.log(`[Discovery/loader] ${title} – ${duration}ms`)
    });
}

export function preloader(options) {
    options = options || {};

    const container = options.container || document.body;
    const el = document.createElement('div');
    const shadowRoot = el.attachShadow({ mode: 'open' });

    if (options.dataSource && !dataSource.hasOwnProperty(options.dataSource)) {
        throw new Error(`dataSource "${options.dataSource}" is not supported`);
    }

    const darkmode = applyContainerStyles(container, options);

    if (darkmode) {
        el.setAttribute('darkmode', '');
    }

    const loadData = dataSource[options.dataSource || 'url'];
    const loading = options.data
        ? options.dataSource === 'push' ? loadData() : loadData(options.data, options.loadDataOptions)
        : {
            result: Promise.resolve({})
        };

    if (loading.push) {
        window.discoveryLoader = {
            push: loading.push,
            finish: () => {
                delete window.discoveryLoader;
                loading.finish();
            }
        };
    }

    const domReady = injectStyles(shadowRoot, options.styles);
    const progressbar = options.progressbar || createProgressbar(domReady, loading.title);
    const disposeEmbed = options.embed ? initPreloadEmbedApi(loading) : () => {};

    if (loading.state) {
        syncLoaderWithProgressbar(loading, progressbar);
    }

    shadowRoot.append(progressbar.el);
    container.append(el);

    return Object.assign(
        loading.result,
        { el, shadowRoot, progressbar, disposeEmbed }
    );
}

function initPreloadEmbedApi(loading) {
    const hostId = randomId();
    const parentWindow = window.parent;
    const postponeMessages = [];
    const sendMessage = (type, payload = null) => {
        // console.log('[post-message]', type, payload);
        parentWindow.postMessage({
            from: 'discoveryjs-app',
            id: hostId,
            type,
            payload
        }, '*');
    };

    const sendDestroyMessage = () => sendMessage('destroy');
    const processIncomingMessage = (event) => {
        const { id, type } = event.data || {};

        if (id === hostId) {
            switch (type) {
                // case 'name': {
                //     postponeMessages.push(event.data);
                //     break;
                // }

                default:
                    console.error(`[Discovery/loader] Unknown preload message type "${type}"`);
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

    const unsubscribeLoading = loading.state
        ? loading.state.subscribeSync(({ stage, progress, error }) => {
            if (error || stage === 'received') {
                unsubscribeLoading();
            }

            return sendMessage('loadingState', { stage, progress, error });
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
