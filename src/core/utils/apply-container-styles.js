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
const containerBeforeSetStyle = new WeakMap();

function saveContainerStyleProp(container, prop, styles) {
    if (prop in styles === false) {
        styles[prop] = [
            container.style.getPropertyValue(prop),
            container.style.getPropertyPriority(prop)
        ];
    }
}

export function applyContainerStyles(container, config) {
    config = config || {};

    if (!containerBeforeSetStyle.has(container)) {
        containerBeforeSetStyle.set(container, Object.create(null));
    }

    const darkmode = resolveDarkmodeValue(config.darkmode, config.darkmodePersistent);
    const containerStyles = containerBeforeSetStyle.get(container);

    for (const [prop, value] of Object.entries(styles)) {
        if (knowContainer.has(container) || !/^transition/.test(prop)) {
            saveContainerStyleProp(container, prop, containerStyles);
            container.style.setProperty(prop, value);
        }
    }

    for (const [prop, value] of Object.entries(darkmodeStyles)) {
        saveContainerStyleProp(container, prop, containerStyles);

        if (darkmode) {
            container.style.setProperty(prop, value);
        } else {
            container.style.removeProperty(prop);
        }
    }

    knowContainer.add(container);
}

export function rollbackContainerStyles(container) {
    if (containerBeforeSetStyle.has(container)) {
        const containerStyles = containerBeforeSetStyle.get(container);

        for (const [prop, value] of Object.entries(containerStyles)) {
            container.style.setProperty(prop, ...value);
        }

        containerBeforeSetStyle.delete(containerBeforeSetStyle);
        knowContainer.delete(container);
    }
}
