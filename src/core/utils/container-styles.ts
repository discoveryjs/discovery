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
const darkmodeStyles: Styles = {
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

function resolveDarkmode(darkmode: boolean | 'false' | 'light' | 'true' | 'dark'| 'auto') {
    switch (darkmode) {
        case 'auto':
            return matchMedia('(prefers-color-scheme:dark)').matches;

        case 'dark':
        case 'true':
        case true:
            return true;

        case 'light':
        case 'false':
        case false:
            return false;
    }

    // bad value
    return false;
}

export function applyContainerStyles(container: HTMLElement, darkmode: boolean | 'false' | 'light' | 'true' | 'dark'| 'auto') {
    const containerStyles = stylesBeforeApply.get(container) || Object.create(null);
    const resolvedDarkmode = resolveDarkmode(darkmode);

    for (const [prop, value] of Object.entries(styles)) {
        if (stylesBeforeApply.has(container)) {
            saveContainerStyleProp(container, prop, containerStyles);
            container.style.setProperty(prop, value);
        }
    }

    for (const [prop, value] of Object.entries(darkmodeStyles)) {
        saveContainerStyleProp(container, prop, containerStyles);

        if (resolvedDarkmode) {
            container.style.setProperty(prop, value);
        } else {
            container.style.removeProperty(prop);
        }
    }

    stylesBeforeApply.set(container, containerStyles);

    return resolvedDarkmode;
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
