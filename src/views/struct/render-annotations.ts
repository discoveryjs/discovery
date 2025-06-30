import type { ViewModel } from '../../main/view-model.js';
import type { Query } from '../../main/model.js';
import type { RenderContext, TooltipConfig } from '../../core/view.js';
import { createElement } from '../../core/utils/dom.js';
import { numDelim } from '../../core/utils/html.js';
import { getImageContent } from '../../core/utils/image.js';

export type ValueAnnotation = { query: Query, debug?: string | boolean };
export type ValueAnnotationContext = {
    parent: ValueAnnotationContext | null;
    host: any;
    key: string | number;
    index: number;
};

type RenderAnnotation = {
    el: HTMLElement;
    config: Partial<RenderAnnotationConfig>;
    renderer: RenderContext;
    data: unknown;
    context: unknown;
};
type MaybeRenderAnnotationConfig = {
    [K in keyof RenderAnnotationConfig]: unknown;
};
type RenderAnnotationConfig = {
    place: 'before' | 'after'; // the placement of an annotation, "after" is by default
    style: 'none' | 'badge' | 'default'; // appereance of annotation, "default" is by default
    className: string;         // a class to add to an annotation element
    text: any;                 // text content of an annotation element
    icon: string;              // name of icon or url to an image
    href: string;              // annotation is a link and that's an URL
    external: boolean;         // open a link in new tab, make sence when `href` is specified only
    tooltip: TooltipConfig;    // configuration for a tooltip, the same as for any view
};

const styles = ['none', 'default', 'badge'];
const annotationsElByEl = new WeakMap<HTMLElement, HTMLElement>();

export function concatAnnotations(a: ValueAnnotation[] | false, b: ValueAnnotation[] | false) {
    if (Array.isArray(a)) {
        return Array.isArray(b)
            ? a.concat(b)
            : a;
    }

    return b;
}

export function preprocessAnnotations(annotations: unknown[]) {
    if (Array.isArray(annotations) && annotations.length > 0) {
        return annotations.map((annotation) =>
            typeof annotation === 'string' || typeof annotation === 'function'
                ? { query: annotation as Query }
                : annotation as ValueAnnotation
        );
    }

    return false;
}

function imageAnnotation(value: unknown) {
    if (typeof value === 'string' && value.length > 64) {
        const imageContent = getImageContent(value);

        if (imageContent !== null) {
            return {
                place: 'before',
                style: 'badge',
                text: 'image',
                imageContent,
                tooltip: {
                    className: 'view-struct_image-preview-tooltip',
                    content: 'image-preview{ src: #.config.imageContent | `data:image/${type},${content}` }'
                }
            };
        }
    }
}

export function getDefaultAnnotations(host: ViewModel) {
    const markerAnnotations = [...host.objectMarkers.values].map(({ name, lookup }) =>
        (value: unknown, context: ValueAnnotationContext) => {
            const marker = lookup(value, true);

            if (marker !== null && marker.object !== context.host) {
                return {
                    place: 'before',
                    style: 'badge',
                    text: name,
                    href: marker.href
                };
            }
        }
    );

    return preprocessAnnotations([...markerAnnotations, imageAnnotation]);
}

export function prepareAnnotations(
    viewAnnotations: unknown[],
    customAnnotations: ValueAnnotation[]
) {
    return concatAnnotations(customAnnotations, preprocessAnnotations(viewAnnotations));
}

function isValidStyle(value: unknown): value is RenderAnnotationConfig['style'] {
    return styles.includes(value as string);
}

export function renderAnnotations(annotations: RenderAnnotation[]) {
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
            text: _text,
            icon,
            href,
            external,
            tooltip
        } = config as MaybeRenderAnnotationConfig;
        const style = isValidStyle(config.style) ? config.style : (place === 'before' ? 'none' : 'default');
        const text = _text === undefined
            ? typeof config !== 'object' ? String(config) : ''
            : String(_text);
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
            href: typeof href === 'string' ? href : undefined,
            target: external ? '_blank' : undefined
        });

        if (hasText) {
            if (/\d{4}/.test(text)) {
                annotationEl.innerHTML = numDelim(text);
            } else {
                annotationEl.append(text);
            }
        }

        if (typeof icon === 'string') {
            annotationEl.classList.add('icon');

            if (/^[a-z_$][a-z0-9_$-]*$/i.test(icon)) {
                annotationEl.classList.add('icon-' + icon);
            } else {
                annotationEl.style.setProperty('--annotation-image', `url("${icon}")`);
            }
        }

        if (tooltip) {
            renderer.tooltip(annotationEl, tooltip, data, { ...context as object, config });
        }

        if (place === 'before') {
            el.before(annotationEl);
        } else {
            const parentEl = el.parentNode as HTMLElement;
            let annotationsEl: HTMLElement | undefined = annotationsElByEl.get(el);

            if (annotationsEl === undefined) {
                annotationsElByEl.set(el, annotationsEl = createElement('span', 'value-annotations'));

                if (parentEl.classList.contains('struct-expanded-value')) {
                    el.querySelector(':scope > .value-size, :scope > .string-length')
                        ?.after(annotationsEl);
                } else {
                    parentEl.append(annotationsEl);
                }
            }

            annotationsEl.append(annotationEl);
        }
    }

    annotations.splice(0, i);
}
