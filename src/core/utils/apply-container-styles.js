import { resolveDarkmodeValue } from '../darkmode.js';

const styles = {
    'font-family': 'Tahoma, Verdana, Arial, sans-serif',
    'font-size': '16px',
    'line-height': '1.6',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'background-color': 'var(--discovery-background-color, white)',
    'color': 'var(--discovery-color, black)',
    'transition-property': 'background-color, color',
    'transition-duration': '.25s',
    'transition-timing-function': 'ease-in'
};
const darkmodeStyles = {
    '--discovery-background-color': '#242424',
    '--discovery-color': '#cccccc'
};
const knowContainer = new WeakSet();

export default function(container, config) {
    config = config || {};

    const darkmode = resolveDarkmodeValue(config.darkmode, config.darkmodePersistent);

    for (const [prop, value] of Object.entries(styles)) {
        if (!knowContainer.has(container) || !/^transition/.test(prop)) {
            container.style.setProperty(prop, value);
        }
    }

    for (const [prop, value] of Object.entries(darkmodeStyles)) {
        if (darkmode) {
            container.style.setProperty(prop, value);
        } else {
            container.style.removeProperty(prop);
        }
    }

    knowContainer.add(container);
}
