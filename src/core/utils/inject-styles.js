import { createElement } from './dom.js';

export default function injectStyles(el, styles) {
    const foucFix = createElement('style', null, ':host{display:none}');
    const awaitingStyles = new Set();
    let readyStyles = Promise.resolve();

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
                    return createElement('style', null, style.content);

                case 'link': {
                    let resolveStyle;
                    let rejectStyle;
                    let state = new Promise((resolve, reject) => {
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

                            if (!awaitingStyles.size) {
                                foucFix.remove();
                            }
                        },
                        onload() {
                            awaitingStyles.delete(state);
                            resolveStyle();

                            if (!awaitingStyles.size) {
                                foucFix.remove();
                            }
                        }
                    });

                    return linkEl;
                }

                default:
                    throw new Error(`Unknown type "${style.type}" for a style descriptor`);
            }
        }));

        if (awaitingStyles.size) {
            readyStyles = Promise.all(awaitingStyles);
            el.append(foucFix);
        }
    }

    return readyStyles;
}
