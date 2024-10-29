import { InitValue, resolveDarkmodeValue } from '../darkmode.js';

type Styles = Record<string, string>;
type SavedStyles = Record<string, [string, string]>;
export type ApplyContainerStylesOptions = {
    darkmode?: InitValue,
    darkmodePersistent?: boolean;
};

const styles: Styles = {
    'font-family': 'Tahoma, Verdana, Arial, sans-serif',
    'font-size': '14px',
    'line-height': '1.6',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'background-color': 'var(--discovery-background-color, white)',
    'color': 'var(--discovery-color, black)',
    'transition-property': 'background-color, color',
    'transition-duration': '.25s',
    'transition-timing-function': 'ease-in'
};
const darkmodeStyles: Styles = {
    '--discovery-background-color': '#242424',
    '--discovery-color': '#cccccc'
};
const knowContainer = new WeakSet<HTMLElement>();
const containerBeforeSetStyle = new WeakMap<HTMLElement, SavedStyles>();

function saveContainerStyleProp(container: HTMLElement, prop: string, styles: SavedStyles) {
    if (prop in styles === false) {
        styles[prop] = [
            container.style.getPropertyValue(prop),
            container.style.getPropertyPriority(prop)
        ];
    }
}

export function applyContainerStyles(container: HTMLElement, options: ApplyContainerStylesOptions) {
    options = options || {};

    if (!containerBeforeSetStyle.has(container)) {
        containerBeforeSetStyle.set(container, Object.create(null));
    }

    const darkmode = resolveDarkmodeValue(options.darkmode, options.darkmodePersistent);
    const containerStyles = containerBeforeSetStyle.get(container) ?? {};

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

    return darkmode;
}

export function rollbackContainerStyles(container: HTMLElement) {
    if (containerBeforeSetStyle.has(container)) {
        const containerStyles = containerBeforeSetStyle.get(container) ?? {};

        for (const [prop, value] of Object.entries(containerStyles)) {
            container.style.setProperty(prop, ...value);
        }

        containerBeforeSetStyle.delete(container);
        knowContainer.delete(container);
    }
}
