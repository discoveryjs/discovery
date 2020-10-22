/* eslint-env browser */
import usage from './dropdown.usage.js';

const { hasOwnProperty } = Object.prototype;

function simpleCompare(a, b) {
    if (!a || !b) {
        return a !== b;
    }

    if (typeof a !== 'object' || typeof b !== 'object') {
        return a !== b;
    }

    for (const k in a) {
        if (hasOwnProperty.call(a, k) && a[k] !== b[k]) {
            return true;
        }
    }

    for (const k in b) {
        if (hasOwnProperty.call(b, k) && a[k] !== b[k]) {
            return true;
        }
    }

    return false;
}

function getDelta(current, init, data, context) {
    const delta = {};

    for (let k in current) {
        if (current[k] !== init[k] || !hasOwnProperty.call(context, k)) {
            delta[k] = current[k];
        }
    }

    return delta;
}

export default function(discovery) {
    discovery.view.define('dropdown', function(el, config, data, context) {
        function renderCaption() {
            captionEl.innerHTML = '';
            return discovery.view.render(captionEl, caption || 'text', data, viewContext);
        }

        const {
            name,
            value,
            placeholder,

            caption,
            content,

            compare,
            prepareValue,

            onInit,
            onChange
        } = config;
        let currentValue = 'value' in config ? value : context[name];
        let dropdownPopup = null;
        const captionEl = el.appendChild(document.createElement('div'));
        let viewContext = { ...context, ...currentValue };

        if (placeholder) {
            el.dataset.placeholder = placeholder;
        }

        el.tabIndex = 0;
        el.addEventListener('click', () => {
            if (dropdownPopup === null) {
                dropdownPopup = new discovery.view.Popup({ className: 'view-dropdown-popup' });
            }

            let sessionContext;
            dropdownPopup.toggle(el, popupEl =>
                discovery.view.render(popupEl, {
                    view: 'context',
                    modifiers: {
                        view: 'block',
                        className: 'content',
                        content
                    },
                    content: {
                        view: 'context',
                        data(data, newContext) {
                            let changed;

                            if (sessionContext === undefined) {
                                sessionContext = { ...newContext };
                                changed = false;
                            } else {
                                changed = typeof compare === 'function'
                                    ? compare(newContext, sessionContext)
                                    : simpleCompare(newContext, sessionContext);
                            }
        
                            return { changed, newContext };
                        },
                        content: {
                            view: 'block',
                            className: [
                                'confirm',
                                data => data.changed ? 'changed' : false
                            ],
                            content: [
                                {
                                    view: 'button-primary',
                                    disabled: '=not changed',
                                    content: 'text:"Apply"',
                                    onClick(el, data, context) {
                                        viewContext = data.newContext;

                                        if (typeof onChange === 'function') {
                                            onChange(
                                                typeof prepareValue === 'function'
                                                    ? prepareValue(data.newContext, sessionContext, data, context)
                                                    : { ...currentValue, ...getDelta(data.newContext, sessionContext, data, context) },
                                                name,
                                                data,
                                                context
                                            );
                                        }

                                        dropdownPopup.hide();
                                        renderCaption();
                                    }
                                },
                                {
                                    view: 'button',
                                    disabled: '=not changed',
                                    content: 'text:"Cancel"',
                                    onClick() {
                                        dropdownPopup.hide();
                                    }
                                }
                            ]
                        }
                    }
                }, data, viewContext)
            )
        });

        captionEl.className = 'view-dropdown__caption';

        if (typeof onInit === 'function') {
            onInit(
                currentValue,
                name,
                data,
                context
            );
        }

        renderCaption();
    }, { usage });
}
