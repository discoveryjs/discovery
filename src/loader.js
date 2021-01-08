import { loadDataFrom } from './core/utils/load-data.js';

export function loader(config = {}) {
    // config
    //   capture
    //   module
    //   styles
    //   data
    //   dataType
    //   options

    const options = config.options || {};
    const styles = [];

    if (config.capture) {
        if (options.darkmode) {
            //
        }
    }

    // warmup styles
    if (Array.isArray(config.styles)) {
        for (const style of config.styles) {
            if (/^(https?:)?\/\/|\.css/.test(style)) {
                styles.push(fetch(style).then(res => res.text()));
            } else {
                styles.push(style);
            }
        }
    }

    if (config.dataType && !loadDataFrom.hasOwnProperty(config.dataType)) {
        throw new Error(`dataType "${config.dataType}" is not supported`);
    }

    const loadData = loadDataFrom[config.dataType || 'url'];

    return Promise.all([
        config.module,
        config.data ? loadData(config.data, () => {}, 'data').result : config,
        ...styles
    ]).then(([module, { data }, ...styles]) => {
        module({ ...options, styles }, data);
    });
}
