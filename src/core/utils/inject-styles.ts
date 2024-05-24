import { createElement } from './dom.js';

export type InlineStyle = {
    type: 'style' | 'inline';
    content: string;
    media?: string;
};
export type LinkStyle = {
    type: 'link' | 'external';
    href: string;
    media?: string;
};
export type Style = string | InlineStyle | LinkStyle;

export default async function injectStyles(el: HTMLElement, styles: Style[]) {
    const foucFix = createElement('style', null, ':host{display:none}');
    const awaitingStyles = new Set<Promise<void>>();

    if (Array.isArray(styles)) {
        el.append(...styles.map(style => {
            if (typeof style === 'string') {
                style = {
                    type: 'style',
                    content: style
                };
            }

            switch (style.type) {
                case 'style':
                case 'inline':
                    return createElement('style', {
                        media: style.media
                    }, style.content);

                case 'link':
                case 'external': {
                    let resolveStyle: () => void;
                    let rejectStyle: (err?: any) => void;
                    let state = new Promise<void>((resolve, reject) => {
                        resolveStyle = resolve;
                        rejectStyle = reject;
                    });

                    awaitingStyles.add(state);

                    const linkEl = createElement('link', {
                        rel: 'stylesheet',
                        href: style.href,
                        media: style.media,
                        onerror(err) {
                            awaitingStyles.delete(state);
                            rejectStyle(err);
                        },
                        onload() {
                            awaitingStyles.delete(state);
                            resolveStyle();
                        }
                    });

                    return linkEl;
                }

                default:
                    throw new Error(`Unknown type "${(style as any).type}" for a style descriptor`);
            }
        }));

        if (awaitingStyles.size) {
            el.append(foucFix);
            await Promise.all(awaitingStyles);
            foucFix.remove();
        }
    }
}
