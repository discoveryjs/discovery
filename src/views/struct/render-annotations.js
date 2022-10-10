import { createElement } from '../../core/utils/dom.js';

const styles = ['none', 'default', 'badge'];

export default function renderAnnotations(annotations) {
    const renderUntil = Date.now() + 8; // render as much annotations as possible in 8 ms
    let i = 0;

    for (; i < annotations.length; i++) {
        if (Date.now() > renderUntil) {
            break;
        }

        const { el, config, renderer, data, context } = annotations[i];
        const {
            place = 'after',
            className,
            text = typeof config !== 'object' ? String(config) : '',
            icon,
            href,
            external,
            tooltip
        } = config;
        const style = styles.includes(config.style) ? config.style : (place === 'before' ? 'none' : 'default');
        const hasText = text !== '';
        const elClassName = [
            'value-annotation',
            'style-' + style,
            place === 'before' ? 'before' : 'after',
            hasText ? 'has-text' : '',
            className || ''
        ].join(' ');

        const annotationEl = createElement(href ? 'a' : 'span', {
            class: elClassName,
            href,
            target: external ? '_blank' : undefined
        }, hasText ? [text] : undefined);

        if (icon) {
            annotationEl.classList.add('icon');

            if (/^[a-z_$][a-z0-9_$-]*$/i.test(icon)) {
                annotationEl.classList.add('icon-' + icon);
            } else {
                annotationEl.style.setProperty('--annotation-image', `url("${icon}")`);
            }
        }

        if (tooltip) {
            renderer.tooltip(annotationEl, tooltip, data, { ...context, config });
        }

        if (place === 'before') {
            el.before(annotationEl);
        } else {
            el.parentNode.append(annotationEl);
        }
    }

    annotations.splice(0, i);
}
