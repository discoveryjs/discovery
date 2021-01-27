import Progressbar from './core/utils/progressbar.js';
import { loadDataFrom, syncLoaderWithProgressbar } from './core/utils/load-data.js';
import applyContainerStyles from './core/utils/apply-container-styles.js';

function defaultProgressbar() {
    return new Progressbar({
        delay: 300,
        onTiming: ({ title, duration }) =>
            console.log(`[Discovery/loader] ${title} – ${duration}ms`)
    });
}

export function loader(config = {}) {
    // config
    //   data
    //   dataType
    //   container
    //   progressbar

    const container = config.container || document.body;
    const progressbar = config.progressbar || defaultProgressbar();

    if (config.dataType && !loadDataFrom.hasOwnProperty(config.dataType)) {
        throw new Error(`dataType "${config.dataType}" is not supported`);
    }

    applyContainerStyles(container, config);

    const loadData = loadDataFrom[config.dataType || 'url'];
    const loading = config.data
        ? loadData(config.data, 'data')
        : {
            result: Promise.resolve(config)
        };

    if (loading.state) {
        container.append(progressbar.el);
        syncLoaderWithProgressbar(loading, progressbar);
    }

    return Object.assign(
        loading.result,
        { progressbar }
    );
}
