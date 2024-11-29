import { ColorSchemeState, resolveColorSchemeValue } from '../color-scheme.js';

type Styles = Record<string, string>;
type SavedStyles = Record<string, [string, string]>;

const stylesBeforeApply = new WeakMap<HTMLElement, SavedStyles>();
const styles: Styles = {
    'font-family': 'Tahoma, Verdana, Arial, sans-serif',
    'font-size': '14px',
    'line-height': '1.6',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'background-color': 'var(--discovery-background-color, white)',
    'color': 'var(--discovery-color, black)'
};
const darkStyles: Styles = {
    '--discovery-background-color': '#242424',
    '--discovery-color': '#cccccc'
};

function saveContainerStyleProp(container: HTMLElement, prop: string, styles: SavedStyles) {
    if (prop in styles === false) {
        styles[prop] = [
            container.style.getPropertyValue(prop),
            container.style.getPropertyPriority(prop)
        ];
    }
}

export function applyContainerStyles(container: HTMLElement, colorScheme: ColorSchemeState) {
    const containerStyles = stylesBeforeApply.get(container) || Object.create(null);
    const isDarkColorScheme = resolveColorSchemeValue(colorScheme) === 'dark';

    for (const [prop, value] of Object.entries(styles)) {
        saveContainerStyleProp(container, prop, containerStyles);
        container.style.setProperty(prop, value);
    }

    for (const [prop, value] of Object.entries(darkStyles)) {
        saveContainerStyleProp(container, prop, containerStyles);

        if (isDarkColorScheme) {
            container.style.setProperty(prop, value);
        } else {
            container.style.removeProperty(prop);
        }
    }

    stylesBeforeApply.set(container, containerStyles);

    return isDarkColorScheme;
}

export function rollbackContainerStyles(container: HTMLElement) {
    const containerStyles = stylesBeforeApply.get(container);

    if (containerStyles !== undefined) {
        for (const [prop, value] of Object.entries(containerStyles)) {
            container.style.setProperty(prop, ...value);
        }
    }

    stylesBeforeApply.delete(container);
}
