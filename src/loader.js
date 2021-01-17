import { loadDataFrom } from './core/utils/load-data.js';
import defaultProgressbar from './core/utils/progressbar.js';
import applyContainerStyles from './core/utils/apply-container-styles.js';

export function loader(config = {}) {
    // config
    //   data
    //   dataType
    //   container
    //   progressbar

    const container = config.container || document.body;
    const progressbar = config.progressbar || defaultProgressbar;

    if (config.dataType && !loadDataFrom.hasOwnProperty(config.dataType)) {
        throw new Error(`dataType "${config.dataType}" is not supported`);
    }

    applyContainerStyles(container, config);

    const loadData = loadDataFrom[config.dataType || 'url'];
    const loading = config.data
        ? loadData(config.data, () => {}, 'data')
        : {
            result: Promise.resolve(config)
        };

    if (loading.state) {
        const { el, dispose } = progressbar(loading.state);

        el.style.margin = '20px';
        el.style.maxWidth = '300px';
        container.append(el);
        loading.result.finally(dispose);
    }

    return loading.result.then(({ data }) => data);
}
