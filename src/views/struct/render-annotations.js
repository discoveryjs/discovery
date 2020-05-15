import { createElement } from '../../core/utils/dom.js';

export default function renderAnnotations(annotations) {
    const startTime = Date.now();
    let i = 0;

    for (; i < annotations.length; i++) {
        if (i % 20 === 0 && Date.now() - startTime > 10) {
            break;
        }

        const { el, data } = annotations[i];
        const {
            place,
            className,
            text = typeof data !== 'object' ? String(data) : '',
            title,
            icon,
            href,
            external
        } = data;
        const hasText = text !== '';
        const elClassName = [
            'value-annotation',
            place === 'before' ? 'before' : 'after',
            hasText ? 'has-text' : '',
            className || ''
        ].join(' ');

        const annotationEl = createElement(href ? 'a' : 'span', {
            class: elClassName,
            title,
            href,
            target: external ? '_blank' : undefined
        }, text !== '' ? [text] : undefined);

        if (icon) {
            annotationEl.classList.add('icon');
            if (/^[a-z_$][a-z0-9_$-]*$/i.test(icon)) {
                annotationEl.classList.add('icon-' + icon);
            } else {
                annotationEl.style.setProperty('--annotation-image', `url("${icon}")`);
            }
        }

        if (place === 'before') {
            el.before(annotationEl);
        } else {
            el.parentNode.append(annotationEl);
        }
    }

    annotations.splice(0, i);
}
