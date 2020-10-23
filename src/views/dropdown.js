/* eslint-env browser */
import usage from './dropdown.usage.js';

const { hasOwnProperty } = Object.prototype;

function simpleCompare(a, b) {
    if (!a || !b) {
        return a === b;
    }

    if (typeof a !== 'object' || typeof b !== 'object') {
        return a === b;
    }

    for (const k in a) {
        if (hasOwnProperty.call(a, k) && a[k] !== b[k]) {
            return false;
        }
    }

    for (const k in b) {
        if (hasOwnProperty.call(b, k) && a[k] !== b[k]) {
            return false;
        }
    }

    return true;
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
        function isEqual(a, b) {
            return typeof compare === 'function'
                ? compare(a, b)
                : simpleCompare(a, b);
        }

        function renderCaption() {
            captionEl.innerHTML = '';

            return discovery.view.render(
                captionEl,
                caption || 'text',
                data,
                { ...context, [name || '__self']: currentValue }
            );
        }

        function applyNewValue(newValue) {
            currentValue = newValue;

            if (typeof onChange === 'function') {
                onChange(currentValue, name, data, context);
            }

            dropdownPopup.hide();
            renderCaption();
        }

        function renderButtons(initContext, sessionContext) {
            if (buttonsEl) {
                const state = {
                    changed: !isEqual(initContext, sessionContext)
                };

                buttonsEl.innerHTML = '';
                discovery.view.render(buttonsEl, [
                    {
                        view: 'button-primary',
                        disabled: '=not changed',
                        content: 'text:"Apply"',
                        onClick(el, data, sessionContext) {
                            applyNewValue(sessionContext);
                        }
                    },
                    {
                        view: 'button',
                        when: () => resetValue && !isEqual(resetValue, currentValue),
                        content: 'text:"Reset"',
                        onClick() {
                            applyNewValue(resetValue);
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
                ], state, sessionContext);
            }
        }

        const {
            name,
            resetValue,
            value,
            placeholder,

            caption,
            content,

            compare,

            onInit,
            onChange
        } = config;
        let currentValue = 'value' in config ? value : context[name];
        let dropdownPopup = null;
        const captionEl = el.appendChild(document.createElement('div'));
        let buttonsEl;

        if (placeholder) {
            el.dataset.placeholder = placeholder;
        }

        el.tabIndex = 0;
        el.addEventListener('click', () => {
            if (dropdownPopup === null) {
                dropdownPopup = new discovery.view.Popup({ className: 'view-dropdown-popup' });
            }

            let sessionContext = { ...currentValue };
            let initContext;

            dropdownPopup.toggle(el, popupEl =>
                discovery.view.render(popupEl, [
                    {
                        view: 'block',
                        className: 'content',
                        content: discovery.view.composeConfig(content, {
                            onInit(value, name) {
                                sessionContext[name] = value;
                            },
                            onChange(value, name) {
                                sessionContext[name] = value;
                                renderButtons(initContext, sessionContext);
                            }
                        })
                    },
                    {
                        view: 'block',
                        className: 'confirm',
                        postRender(el) {
                            buttonsEl = el;
                        }
                    }
                ], data, { ...context, ...currentValue }).then(() => {
                    initContext = { ...sessionContext };
                    renderButtons(initContext, sessionContext);
                })
            )
        });

        captionEl.className = 'view-dropdown__caption';

        if (typeof onInit === 'function') {
            onInit(currentValue, name, data, context);
        }

        renderCaption();
    }, { usage });
}
