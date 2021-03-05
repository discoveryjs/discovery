import Progressbar from './core/utils/progressbar.js';
import { dataSource, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import { applyContainerStyles } from './core/utils/container-styles.js';
import injectStyles from './core/utils/inject-styles.js';

function defaultProgressbar() {
    return new Progressbar({
        delay: 300,
        onTiming: ({ title, duration }) =>
            console.log(`[Discovery/loader] ${title} – ${duration}ms`)
    });
}

export function preloader(config) {
    config = config || {};

    const container = config.container || document.body;
    const progressbar = config.progressbar || defaultProgressbar();
    const el = document.createElement('div');
    const shadowRoot = el.attachShadow({ mode: 'open' });

    if (config.dataSource && !dataSource.hasOwnProperty(config.dataSource)) {
        throw new Error(`dataSource "${config.dataSource}" is not supported`);
    }

    applyContainerStyles(container, config);

    const loadData = dataSource[config.dataSource || 'url'];
    const loading = config.dataSource === 'push'
        ? loadData()
        : config.data
            ? loadData(config.data, 'data')
            : {
                result: Promise.resolve(config)
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

    if (loading.state) {
        syncLoaderWithProgressbar(loading, progressbar);
    }

    injectStyles(shadowRoot, config.styles);
    shadowRoot.append(progressbar.el);
    container.append(el);

    return Object.assign(
        loading.result,
        { el, shadowRoot, progressbar }
    );
}
