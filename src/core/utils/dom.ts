/* eslint-env browser */
import { hasOwn } from './object-utils.js';

export type CreateElementAttrs<TagName extends keyof HTMLElementTagNameMap> = {
  [key in keyof HTMLElementEventMap as `on${key}`]?: (
    this: HTMLElementTagNameMap[TagName],
    evt: HTMLElementEventMap[key]
  ) => void;
} & {
  [key: string]: any | undefined; // TODO: replace "any" with "string"
};

export function createElement<TagName extends keyof HTMLElementTagNameMap>(
    tag: TagName,
    attrs?: CreateElementAttrs<TagName> | string | null,
    children?: (Node | string)[] | string
): HTMLElementTagNameMap[TagName] {
    const el = document.createElement(tag);

    if (typeof attrs === 'string') {
        attrs = {
            class: attrs
        };
    }

    for (const attrName in attrs) {
        if (hasOwn(attrs, attrName)) {
            const value = attrs[attrName];

            if (typeof value === 'undefined') {
                continue;
            }

            if (typeof value === 'function') {
                el.addEventListener(attrName.slice(2), value);
            } else {
                el.setAttribute(attrName, value);
            }
        }
    }

    if (Array.isArray(children)) {
        el.append(...children);
    } else if (typeof children === 'string') {
        el.innerHTML = children;
    }

    return el;
}

export function createText(text: any) {
    return document.createTextNode(String(text));
}

export function isDocumentFragment(value: Node): value is DocumentFragment {
    return value.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

export function createFragment(...children: (Node | string)[]) {
    const fragment = document.createDocumentFragment();

    children.forEach(child =>
        fragment.appendChild(child instanceof Node ? child : createText(child))
    );

    return fragment;
}

export const passiveSupported = /* @__PURE__ */ (() => {
    let passiveSupported = false;

    try {
        const options = {
            // This function will be called when the browser
            // attempts to access the passive property.
            get passive() {
                passiveSupported = true;
                return false;
            }
        };

        const cb = () => {};
        window.addEventListener('test-passive', cb, options);
        window.removeEventListener('test-passive', cb);
    } catch {}

    return passiveSupported;
})();

export const passiveCaptureOptions = !passiveSupported ? true : /* @__PURE__ */ Object.freeze({
    passive: true,
    capture: true
});
