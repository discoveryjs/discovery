import { loadDataFrom } from './core/utils/load-data.js';
import { resolveDarkmodeValue } from './core/darkmode.js';
import defaultProgressbar from './core/utils/progressbar.js';

const styles = {
    'font-family': 'Tahoma, Verdana, Arial, sans-serif',
    'font-size': '16px',
    'line-height': '1.6',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'background-color': 'var(--discovery-background-color, white)',
    'color': 'var(--discovery-color, black)'
};
const darkmodeStyles = {
    '--discovery-background-color': '#242424',
    '--discovery-color': '#cccccc'
};

export function loader(config = {}) {
    // config
    //   data
    //   dataType
    //   container
    //   progressbar

    const container = config.container || document.body;
    const progressbar = config.progressbar || defaultProgressbar;
    const darkmode = resolveDarkmodeValue(config.darkmode, config.darkmodePersistent);
    console.log(config, darkmode);

    if (config.dataType && !loadDataFrom.hasOwnProperty(config.dataType)) {
        throw new Error(`dataType "${config.dataType}" is not supported`);
    }

    for (const [prop, value] of Object.entries(styles)) {
        container.style.setProperty(prop, value);
    }
    if (darkmode) {
        for (const [prop, value] of Object.entries(darkmodeStyles)) {
            container.style.setProperty(prop, value);
        }
    }

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
