import Progressbar from './core/utils/progressbar.js';
import { dataSource, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import { applyContainerStyles } from './core/utils/container-styles.js';
import injectStyles from './core/utils/inject-styles.js';

function createProgressbar(domReady, title) {
    return new Progressbar({
        delay: 300,
        domReady,
        title,
        onTiming: ({ title, duration }) =>
            console.log(`[Discovery/loader] ${title} – ${duration}ms`)
    });
}

export function preloader(config) {
    config = config || {};

    const container = config.container || document.body;
    const el = document.createElement('div');
    const shadowRoot = el.attachShadow({ mode: 'open' });

    if (config.dataSource && !dataSource.hasOwnProperty(config.dataSource)) {
        throw new Error(`dataSource "${config.dataSource}" is not supported`);
    }

    applyContainerStyles(container, config);

    const loadData = dataSource[config.dataSource || 'url'];
    const loading = config.data
        ? config.dataSource === 'push' ? loadData() : loadData(config.data, 'data')
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

    const domReady = injectStyles(shadowRoot, config.styles);
    const progressbar = config.progressbar || createProgressbar(domReady, loading.title);

    if (loading.state) {
        syncLoaderWithProgressbar(loading, progressbar);
    }

    shadowRoot.append(progressbar.el);
    container.append(el);

    return Object.assign(
        loading.result,
        { el, shadowRoot, progressbar }
    );
}
