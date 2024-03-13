/* eslint-env browser */
import { getOffsetParent, getBoundingRect, getViewportRect } from '../../core/utils/layout.js';
import { passiveCaptureOptions } from '../../core/utils/dom.js';
import { pointerXY } from '../../core/utils/pointer.js';

const openedPopups = [];
const delayedToShowPopups = new Set();
const hoverPinModes = [false, 'popup-hover', 'trigger-click'];
const defaultShowDelay = 300;
const defaultOptions = {
    position: 'trigger',
    showDelay: false, // false = 0, true = defaultShowDelay
    hoverTriggers: null,
    hoverPin: false,
    hideIfEventOutside: true,
    hideOnResize: true,
    render: undefined
};

function findTargetRelatedPopup(popup, target) {
    if (popup.el.contains(target)) {
        return popup;
    }

    return popup.relatedPopups.reduce(
        (res, related) => res || findTargetRelatedPopup(related, target),
        null
    );
}

function isElementNullOrInDocument(element) {
    return element ? element.getRootNode({ composed: true }) === document : true;
}

function hideIfEventOutside(event) {
    openedPopups.slice().forEach(popup => popup.hideIfEventOutside(event));
}
function hideOnTriggerHasLeftDocument() {
    openedPopups.slice().forEach(popup => popup.hideOnTriggerHasLeftDocument());
}
function hideOnResize(event) {
    openedPopups.slice().forEach(popup => popup.hideOnResize(event));
}

function showDelayToMs(value, triggerEl) {
    if (typeof value === 'function') {
        value = value(triggerEl);
    }

    if (typeof value === 'number') {
        return isFinite(value) ? value : 0;
    }

    if (typeof value === 'boolean') {
        return value ? defaultShowDelay : 0;
    }

    return 0;
}
function stopDelayedShow(popup) {
    clearTimeout(popup.showDelayTimer);
    popup.showDelayTimer = null;
    popup.showDelayArgs = null;
    delayedToShowPopups.delete(popup);
}

function startDelayedShow(popup, triggerEl, render) {
    clearTimeout(popup.showDelayTimer);
    popup.showDelayTimer = setTimeout(() => popup.show(triggerEl, render, true), showDelayToMs(popup.showDelay, triggerEl));
    popup.showDelayArgs = [triggerEl, render];
    delayedToShowPopups.add(popup);
}

export default function(host) {
    const hoverTriggerInstances = [];
    const inspectorLockedInstances = new Set();
    let globalListeners = null;
    let hideAllPopups = null;
    const addHostElHoverListeners = () => {
        if (globalListeners !== null) {
            return;
        }

        globalListeners = [
            host.addHostElEventListener('mouseenter', ({ target }) => {
                if (target === document) {
                    return;
                }

                for (const instance of hoverTriggerInstances) {
                    const targetRelatedPopup = findTargetRelatedPopup(instance, target);
                    const triggerEl = targetRelatedPopup
                        ? targetRelatedPopup.el
                        : target.closest(instance.hoverTriggers);

                    if (triggerEl) {
                        instance.hideTimer = clearTimeout(instance.hideTimer);

                        if (triggerEl !== instance.lastHoverTriggerEl) {
                            // change hover pinned only when trigger is not a popup in pinned mode
                            if (!targetRelatedPopup || !targetRelatedPopup.hoverPinned) {
                                instance.lastHoverTriggerEl = triggerEl;
                            }

                            // show only if event target isn't a popup
                            if (!targetRelatedPopup) {
                                instance.hoverPinned = false;
                                instance.el.classList.remove('pinned');
                                instance.show(triggerEl);
                            }
                        }
                    }
                }
            }, passiveCaptureOptions),

            host.addHostElEventListener('mouseleave', ({ target }) => {
                for (const instance of hoverTriggerInstances) {
                    if (instance.lastHoverTriggerEl === target) {
                        stopDelayedShow(instance);
                        instance.lastHoverTriggerEl = null;
                        instance.hideTimer = setTimeout(instance.hide, 100);
                    }
                }
            }, passiveCaptureOptions),

            host.addGlobalEventListener('scroll', (event) => {
                hideAllPopups = setTimeout(() => hideIfEventOutside(event), 0);
            }, true),

            host.addHostElEventListener('scroll', (event) => {
                clearTimeout(hideAllPopups);
                hideIfEventOutside(event);
            }),

            host.addGlobalEventListener('click', (event) => {
                hideAllPopups = setTimeout(() => hideIfEventOutside(event), 0);
            }, true),

            host.addHostElEventListener('click', (event) => {
                clearTimeout(hideAllPopups);
                hideIfEventOutside(event);
                setTimeout(hideOnTriggerHasLeftDocument, 50);

                for (const instance of hoverTriggerInstances) {
                    if (instance.hoverPin === 'trigger-click') {
                        if (instance.lastHoverTriggerEl && instance.lastTriggerEl.contains(event.target)) {
                            instance.lastHoverTriggerEl = null;
                            instance.hoverPinned = true;
                            instance.el.classList.add('pinned');

                            event.stopPropagation();
                        }
                    }
                }
            }, true)
        ];
    };

    pointerXY.subscribe(() => {
        for (const popup of openedPopups) {
            if (popup.position === 'pointer' && !popup.hoverPinned && !popup.frozen && !inspectorLockedInstances.has(popup)) {
                popup.updatePosition();
            }
        }
        for (const popup of delayedToShowPopups) {
            startDelayedShow(popup, ...popup.showDelayArgs);
        }
    });

    host.inspectMode.subscribe(
        enabled => enabled
            ? openedPopups.forEach(popup => inspectorLockedInstances.add(popup))
            : inspectorLockedInstances.clear()
    );

    host.view.Popup = class Popup {
        constructor(options) {
            options = {
                ...defaultOptions,
                ...options
            };

            this.el = document.createElement('div');
            this.el.classList.add('discovery-view-popup');

            this.showDelayTimer = null;
            this.showDelayArgs = null;
            this.showDelay = options.showDelay;

            this.hideTimer = null;
            this.hide = this.hide.bind(this);

            this.lastTriggerEl = null;
            this.lastHoverTriggerEl = null;
            this.hoverPinned = false;
            this.frozen = false;
            this.render = options.render;
            this.position = options.position;
            this.hoverTriggers = options.hoverTriggers;
            this.hoverPin = options.hoverPin;
            this.hideIfEventOutsideDisabled = !options.hideIfEventOutside;
            this.hideOnResizeDisabled = !options.hideOnResize;

            if (options.className) {
                this.el.classList.add(options.className);
            }

            if (!hoverPinModes.includes(options.hoverPin)) {
                host.log('warn', `Bad value for \`Popup#options.hoverPin\` (should be ${hoverPinModes.join(', ')}):`, options.hoverPin);
                this.hoverPin = false;
            }

            if (this.hoverTriggers) {
                this.el.classList.add('show-on-hover');
                this.el.dataset.pinMode = this.hoverPin || 'none';

                hoverTriggerInstances.push(this);
                addHostElHoverListeners();
            }
        }

        get relatedPopups() {
            return openedPopups.filter(related => this.el.contains(related.lastTriggerEl));
        }

        get visible() {
            return openedPopups.includes(this);
        }

        toggle(...args) {
            if (this.visible) {
                this.hide();
            } else {
                this.show(...args);
            }
        }

        show(triggerEl, render = this.render, showImmediately = false) {
            if (!this.visible && !showImmediately && showDelayToMs(this.showDelay, triggerEl) > 0) {
                startDelayedShow(this, triggerEl, render);
                return;
            }

            stopDelayedShow(this);
            inspectorLockedInstances.delete(this);
            host.view.setViewRoot(this.el, 'popup', { config: render });

            const hostEl = host.dom.container;

            this.hideTimer = clearTimeout(this.hideTimer);
            this.relatedPopups.forEach(related => related.hide());
            this.el.classList.toggle('inspect', host.inspectMode.value);

            if (typeof render === 'function') {
                this.el.innerHTML = '';
                render(this.el, triggerEl, this.hide);
            }

            if (this.lastTriggerEl) {
                this.lastTriggerEl.classList.remove('discovery-view-popup-active');
            }

            if (triggerEl) {
                triggerEl.classList.add('discovery-view-popup-active');
            }

            this.lastTriggerEl = triggerEl || null;

            if (!this.visible) {
                openedPopups.push(this);

                if (openedPopups.length === 1) {
                    window.addEventListener('resize', hideOnResize);
                }
            }

            this.updatePosition();

            // always append since it can pop up by z-index
            hostEl.appendChild(this.el);
        }

        updatePosition() {
            if (!this.visible || (this.position !== 'pointer' && !this.lastTriggerEl)) {
                return;
            }

            const hostEl = host.dom.container;
            const offsetParent = getOffsetParent(hostEl.firstChild);
            const viewport = getViewportRect(window, offsetParent);
            const { x: pointerX, y: pointerY } = pointerXY.value;
            const pointerOffset = 3;
            const box = this.position !== 'pointer'
                ? getBoundingRect(this.lastTriggerEl, hostEl)
                : {
                    left: parseInt(pointerX) + pointerOffset,
                    right: parseInt(pointerX) - pointerOffset,
                    top: parseInt(pointerY) - pointerOffset,
                    bottom: parseInt(pointerY) + pointerOffset
                };
            const availHeightTop = box.top - viewport.top - 3;
            const availHeightBottom = viewport.bottom - box.bottom - 3;
            const availWidthLeft = box.right - viewport.left - 3;
            const availWidthRight = viewport.right - box.left - 3;

            if (availHeightTop > availHeightBottom) {
                // show to top
                this.el.style.maxHeight = availHeightTop + 'px';
                this.el.style.top = 'auto';
                this.el.style.bottom = (viewport.bottom - box.top) + 'px';
                this.el.dataset.vTo = 'top';
            } else {
                // show to bottom
                this.el.style.maxHeight = availHeightBottom + 'px';
                this.el.style.top = (box.bottom - viewport.top) + 'px';
                this.el.style.bottom = 'auto';
                this.el.dataset.vTo = 'bottom';
            }

            if (availWidthLeft > availWidthRight) {
                // show to left
                this.el.style.left = 'auto';
                this.el.style.right = (viewport.right - box.right) + 'px';
                this.el.style.maxWidth = availWidthLeft + 'px';
                this.el.dataset.hTo = 'left';
            } else {
                // show to right
                this.el.style.left = (box.left - viewport.left) + 'px';
                this.el.style.right = 'auto';
                this.el.style.maxWidth = availWidthRight + 'px';
                this.el.dataset.hTo = 'right';
            }

            this.relatedPopups.forEach(related => related.updatePosition());
        }

        freeze() {
            this.frozen = true;
            this.el.classList.add('frozen');
        }
        unfreeze() {
            this.frozen = false;
            this.el.classList.remove('frozen');
            this.updatePosition();
        }

        hide() {
            this.hideTimer = clearTimeout(this.hideTimer);
            stopDelayedShow(this);

            if (this.visible && !inspectorLockedInstances.has(this)) {
                // hide related popups first
                this.relatedPopups.forEach(related => related.hide());

                // hide popup itself
                openedPopups.splice(openedPopups.indexOf(this), 1);
                this.el.remove();
                this.unfreeze();

                if (this.lastTriggerEl) {
                    this.lastTriggerEl.classList.remove('discovery-view-popup-active');
                    this.lastTriggerEl = null;
                }

                if (openedPopups.length === 0) {
                    window.removeEventListener('resize', hideOnResize);
                }
            }
        }

        hideIfEventOutside({ target }) {
            // the feature is disabled or inspect mode is enabled (i.e. inspecting views)
            if (this.hideIfEventOutsideDisabled || inspectorLockedInstances.has(this)) {
                return;
            }

            // event inside a trigger element
            if (this.lastTriggerEl && this.lastTriggerEl.contains(target)) {
                return;
            }

            // event inside a popup or its related popups
            if (findTargetRelatedPopup(this, target)) {
                return;
            }

            // otherwise hide a popup
            this.hide();
        }

        hideOnTriggerHasLeftDocument() {
            if (!isElementNullOrInDocument(this.lastHoverTriggerEl) ||
                !isElementNullOrInDocument(this.lastTriggerEl)) {
                this.hide();
            }
        }

        hideOnResize() {
            if (this.hideOnResizeDisabled || inspectorLockedInstances.has(this)) {
                return;
            }

            this.hide();
        }

        destroy() {
            inspectorLockedInstances.delete(this);
            stopDelayedShow(this);

            const popupIndex = hoverTriggerInstances.indexOf(this);
            if (popupIndex !== -1) {
                hoverTriggerInstances.splice(popupIndex, 1);
            }

            this.hide();

            this.el = null;
            this.lastTriggerEl = null;
            this.lastHoverTriggerEl = null;
        }
    };
};
