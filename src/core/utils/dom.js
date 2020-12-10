/* eslint-env browser */

export function createElement(tag, attrs, children) {
    const el = document.createElement(tag);

    if (typeof attrs === 'string') {
        attrs = {
            class: attrs
        };
    }

    for (let attrName in attrs) {
        if (hasOwnProperty.call(attrs, attrName)) {
            if (attrs[attrName] === undefined) {
                continue;
            }

            if (attrName.startsWith('on')) {
                el.addEventListener(attrName.substr(2), attrs[attrName]);
            } else {
                el.setAttribute(attrName, attrs[attrName]);
            }
        }
    }

    if (Array.isArray(children)) {
        children.forEach(child =>
            el.appendChild(child instanceof Node ? child : createText(child))
        );
    } else if (typeof children === 'string') {
        el.innerHTML = children;
    }

    return el;
}

export function createText(text) {
    return document.createTextNode(String(text));
}

export function createFragment(...children) {
    const fragment = document.createDocumentFragment();

    children.forEach(child =>
        fragment.appendChild(child instanceof Node ? child : createText(child))
    );

    return fragment;
}

export const passiveSupported = (() => {
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

        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
    } catch (err) {}

    return passiveSupported;
})();

export const passiveCaptureOptions = !passiveSupported ? true : Object.freeze({
    passive: true,
    capture: true
});
