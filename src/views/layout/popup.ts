/* eslint-env browser */
import type { ViewModel } from '../../main/view-model.js';
import { getOffsetParent, getBoundingRect, getViewportRect } from '../../core/utils/layout.js';
import { passiveCaptureOptions } from '../../core/utils/dom.js';
import { pointerXY } from '../../core/utils/pointer.js';

export type PopupTriggerEl = HTMLElement | null | undefined;
export type PopupRender = (el: HTMLElement, triggerEl: PopupTriggerEl, hide: () => void) => void;
export type PopupOptions = {
    position: 'trigger' | 'pointer';
    positionMode: 'safe' | 'natural'; // 'safe' – choose side with more space, 'natural' – choose right/bottom when enough space
    pointerOffsetX: number;
    pointerOffsetY: number;
    showDelay: boolean | number | ((triggerEl: PopupTriggerEl) => boolean | number); // false = 0, true = defaultShowDelay
    hoverTriggers: string | null; // string is a list of css selectors
    hoverPin: false | 'popup-hover' | 'trigger-click';
    hideIfEventOutside: boolean;
    hideOnResize: boolean;
    hideOnTriggerClick: boolean;
    render: PopupRender;
    className: string;
};

const hoverPinModes = [false, 'popup-hover', 'trigger-click'] as const;
const defaultShowDelay = 300;

function isElementNullOrInDocument(element: Element | null) {
    return element ? element.getRootNode({ composed: true }) === document : true;
}

function showDelayToMs(value: PopupOptions['showDelay'], triggerEl: PopupTriggerEl) {
    if (typeof value === 'function') {
        value = value(triggerEl);
    }

    if (typeof value === 'number') {
        return ensureNumber(value);
    }

    if (typeof value === 'boolean') {
        return value ? defaultShowDelay : 0;
    }

    return 0;
}

function appendIfNeeded(parent: HTMLElement, child: HTMLElement) {
    if (parent.lastChild !== child) {
        parent.appendChild(child);
    }
}

function ensureNumber(value: unknown, fallback = 0): number {
    return Number.isFinite(value) ? value as number : fallback;
}

function isHoverPinModeValue(value: unknown): value is PopupOptions['hoverPin'] {
    return hoverPinModes.includes(value as PopupOptions['hoverPin']);
}

export default function(host: ViewModel) {
    const openedPopups: Popup[] = [];
    const delayedToShowPopups = new Set<Popup>();
    const hoverTriggerInstances: Popup[] = [];
    const inspectorLockedInstances = new Set();

    let hideAllPopups: ReturnType<typeof setTimeout> | null = null;
    const setHideAllPopups = (event: Event) => {
        if (hideAllPopups === null) {
            hideAllPopups = setTimeout(() => hideIfEventOutside(event), 0);
        }
    };
    const clearHideAllPopups = () => {
        if (hideAllPopups !== null) {
            clearTimeout(hideAllPopups);
            hideAllPopups = null;
        }
    };

    let globalListeners: (() => void)[] | null = null;
    const addHostElHoverListeners = () => {
        if (globalListeners !== null) {
            return;
        }

        globalListeners = [
            host.addHostElEventListener('mouseenter', ({ target }) => {
                for (const instance of hoverTriggerInstances) {
                    const targetRelatedPopup = findTargetRelatedPopup(instance, target as Node);
                    const triggerEl: HTMLElement | null = targetRelatedPopup
                        ? targetRelatedPopup.el
                        // cast to string since hoverTriggerInstances contains only popup's with hoverTriggers
                        : (target as HTMLElement).closest(instance.hoverTriggers as string);

                    if (triggerEl) {
                        if (instance.hideTimer !== null) {
                            clearTimeout(instance.hideTimer);
                            instance.hideTimer = null;
                        }

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

            host.addGlobalEventListener('scroll', setHideAllPopups, passiveCaptureOptions),
            host.addHostElEventListener('scroll', (event) => {
                clearHideAllPopups();
                hideIfEventOutside(event);
            }, passiveCaptureOptions),

            host.addGlobalEventListener('click', setHideAllPopups, true),
            host.addHostElEventListener('click', (event) => {
                clearHideAllPopups();
                hideIfEventOutside(event);
                setTimeout(hideOnTriggerHasLeftDocument, 50);

                for (const instance of hoverTriggerInstances) {
                    if (instance.hoverPin === 'trigger-click') {
                        if (instance.lastHoverTriggerEl && instance.lastTriggerEl?.contains(event.target as Node)) {
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
            const { showDelayArgs } = popup;

            startDelayedShow(popup, showDelayArgs?.[0], showDelayArgs?.[1]);
        }
    });

    host.inspectMode.subscribe(
        enabled => enabled
            ? openedPopups.forEach(popup => inspectorLockedInstances.add(popup))
            : inspectorLockedInstances.clear()
    );

    function hideIfEventOutside(event: Event) {
        openedPopups.slice().forEach(popup => popup.hideIfEventOutside(event));
    }
    function hideOnTriggerHasLeftDocument() {
        openedPopups.slice().forEach(popup => popup.hideOnTriggerHasLeftDocument());
    }
    function hideOnResize() {
        openedPopups.slice().forEach(popup => popup.hideOnResize());
    }

    function findTargetRelatedPopup(popup: Popup, target: Node): Popup | null {
        if (popup.el.contains(target)) {
            return popup;
        }

        return popup.relatedPopups.find((popup) => findTargetRelatedPopup(popup, target)) || null;
    }

    function stopDelayedShow(popup: Popup) {
        if (popup.showDelayTimer !== null) {
            clearTimeout(popup.showDelayTimer);
        }

        popup.showDelayTimer = null;
        popup.showDelayArgs = null;
        delayedToShowPopups.delete(popup);
    }

    function startDelayedShow(popup: Popup, triggerEl: PopupTriggerEl, render: PopupRender | undefined) {
        if (popup.showDelayTimer !== null) {
            clearTimeout(popup.showDelayTimer);
        }

        popup.showDelayTimer = setTimeout(() => popup.show(triggerEl, render, true), showDelayToMs(popup.showDelay, triggerEl));
        popup.showDelayArgs = [triggerEl, render];
        delayedToShowPopups.add(popup);
    }

    class Popup {
        el: HTMLElement;

        showDelayTimer: ReturnType<typeof setTimeout> | null;
        showDelayArgs: [triggerEl: PopupTriggerEl, render: PopupRender | undefined] | null;
        showDelay: PopupOptions['showDelay'];

        #lastTriggerEl: Element | null;
        lastHoverTriggerEl: HTMLElement | null;
        render: PopupOptions['render'] | undefined;
        position: PopupOptions['position'];
        positionMode: PopupOptions['positionMode'];
        pointerOffsetX: PopupOptions['pointerOffsetX'];
        pointerOffsetY: PopupOptions['pointerOffsetY'];
        hideOnTriggerClick: PopupOptions['hideOnTriggerClick'];
        hoverTriggers: PopupOptions['hoverTriggers'];
        hoverPin: PopupOptions['hoverPin'];

        hideIfEventOutsideDisabled: boolean;
        hideOnResizeDisabled: boolean;
        hideTimer: ReturnType<typeof setTimeout> | null;
        hoverPinned: boolean;
        frozen: boolean;
        lastRenderMarker: symbol | null;

        constructor(options?: Partial<PopupOptions>) {
            const {
                render,
                showDelay = false,
                position = 'trigger',
                positionMode = 'safe',
                pointerOffsetX,
                pointerOffsetY,
                hoverTriggers,
                hoverPin,
                hideIfEventOutside = true,
                hideOnResize = true,
                hideOnTriggerClick = false,
                className
            } = options || {};

            this.el = document.createElement('div');
            this.el.classList.add('discovery-view-popup');

            this.showDelayTimer = null;
            this.showDelayArgs = null;
            this.showDelay = showDelay;

            this.hideTimer = null;
            this.hide = this.hide.bind(this);

            this.#lastTriggerEl = null;
            this.lastHoverTriggerEl = null;
            this.hoverPinned = false;
            this.frozen = false;

            this.render = render;
            this.lastRenderMarker = null;

            this.position = position;
            this.positionMode = positionMode;
            this.pointerOffsetX = ensureNumber(pointerOffsetX, 3);
            this.pointerOffsetY = ensureNumber(pointerOffsetY, 3);
            this.hoverTriggers = hoverTriggers || null;
            this.hoverPin = isHoverPinModeValue(hoverPin) ? hoverPin : false;
            this.hideIfEventOutsideDisabled = !hideIfEventOutside;
            this.hideOnResizeDisabled = !hideOnResize;
            this.hideOnTriggerClick = Boolean(hideOnTriggerClick);

            if (className) {
                this.el.classList.add(className);
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

        get lastTriggerEl() {
            return this.#lastTriggerEl;
        }
        set lastTriggerEl(triggerEl: Element | null) {
            if (this.#lastTriggerEl !== null) {
                this.#lastTriggerEl.classList.remove('discovery-view-popup-active');
            }

            this.#lastTriggerEl = triggerEl && triggerEl instanceof Element ? triggerEl : null;

            if (this.#lastTriggerEl !== null) {
                this.#lastTriggerEl.classList.add('discovery-view-popup-active');
            }
        }

        toggle(...args: Parameters<typeof this.show>) {
            if (this.visible) {
                this.hide();
            } else {
                this.show(...args);
            }
        }

        async show(triggerEl?: PopupTriggerEl, render = this.render, showImmediately = false) {
            // schedule showing if delayed
            if (!this.visible && !showImmediately && showDelayToMs(this.showDelay, triggerEl) > 0) {
                startDelayedShow(this, triggerEl, render);
                return;
            }

            const hostEl = host.dom.container;

            // remove popup from inspector locked instances
            inspectorLockedInstances.delete(this);

            // Bail out when triggerEl is not connected to the host element,
            // which can happen if showing the popup is delayed and the trigger element
            // is removed from the DOM by the time the timer fires.
            // This prevents issues where clicking an element with a tooltip (with delayed displaying)
            // renders new content, and then the tooltip appears attached to the cursor.
            if (triggerEl && !hostEl.contains(triggerEl)) {
                this.hide();
                return;
            }

            // cleanup previous show effects
            stopDelayedShow(this);
            this.relatedPopups.forEach(related => related.hide());

            if (this.hideTimer !== null) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }

            // apply new effects
            this.lastTriggerEl = triggerEl || null;
            this.el.classList.toggle('inspect', host.inspectMode.value);
            host.view.setViewRoot(this.el, 'popup', { config: render });

            // change the visible state if needed
            if (!this.visible) {
                openedPopups.push(this);

                if (openedPopups.length === 1) {
                    window.addEventListener('resize', hideOnResize);
                }
            }

            // render content
            if (typeof render === 'function') {
                this.el.innerHTML = '';

                // setup semaphore to avoid race conditions
                const renderMarker = Symbol();
                this.lastRenderMarker = renderMarker;

                // enforce element insert popup's element and update its position
                // if render doesn't finish until next frame
                requestAnimationFrame(() => {
                    if (this.lastRenderMarker === renderMarker) {
                        appendIfNeeded(hostEl, this.el);
                        this.updatePosition();
                    }
                });

                // perform render itself
                await render(this.el, triggerEl, this.hide);

                // since render might be async, the popup state can be changed (e.g. hidden) when it's done,
                // or another render took place
                if (this.lastRenderMarker !== renderMarker) {
                    return;
                }

                // cleanup semaphore
                this.lastRenderMarker = null;
            }

            // always append since it can pop up by z-index
            appendIfNeeded(hostEl, this.el);
            this.updatePosition();
        }

        updatePosition() {
            if (!this.visible) {
                return;
            }

            const pointerPosition = this.position === 'pointer';
            const boxEl = pointerPosition ? null : this.lastTriggerEl;

            if (pointerPosition ? this.frozen : !boxEl) {
                return;
            }

            const hostEl = host.dom.container;
            const offsetParent = getOffsetParent(hostEl.firstChild as HTMLElement);
            const viewport = getViewportRect(window, offsetParent);
            const { x: pointerX, y: pointerY } = pointerXY.value;
            const { pointerOffsetX, pointerOffsetY } = this;
            const box = boxEl
                ? getBoundingRect(boxEl, hostEl)
                : {
                    left: Math.round(pointerX) - pointerOffsetX,
                    right: Math.round(pointerX) + pointerOffsetX,
                    top: Math.round(pointerY) - pointerOffsetY,
                    bottom: Math.round(pointerY) + pointerOffsetY
                };
            const boxLeft = pointerPosition ? box.left : box.right;
            const boxRight = pointerPosition ? box.right : box.left;
            const availHeightTop = box.top - viewport.top - 3;
            const availHeightBottom = viewport.bottom - box.bottom - 3;
            const availWidthLeft = boxLeft - viewport.left - 3;
            const availWidthRight = viewport.right - boxRight - 3;
            let safeRight = availWidthRight >= availWidthLeft;
            let safeBottom = availHeightBottom >= availHeightTop;

            if (!safeBottom) {
                // show to top
                this.el.style.maxHeight = availHeightTop + 'px';
                this.el.style.top = 'auto';
                this.el.style.bottom = (viewport.bottom - box.top) + 'px';
                this.el.dataset.vTo = 'top';
            }

            if (!safeRight) {
                // show to left
                this.el.style.left = 'auto';
                this.el.style.right = (viewport.right - boxLeft) + 'px';
                this.el.style.maxWidth = availWidthLeft + 'px';
                this.el.dataset.hTo = 'left';
            }

            if (this.positionMode === 'natural' && (!safeRight || !safeBottom)) {
                const { height, width } = getBoundingRect(this.el);

                safeBottom = height <= availHeightBottom;
                safeRight = width <= availWidthRight;
            }

            if (safeBottom) {
                // show to bottom
                this.el.style.maxHeight = availHeightBottom + 'px';
                this.el.style.top = (box.bottom - viewport.top) + 'px';
                this.el.style.bottom = 'auto';
                this.el.dataset.vTo = 'bottom';
            }

            if (safeRight) {
                // show to right
                this.el.style.left = (boxRight - viewport.left) + 'px';
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
            this.lastRenderMarker = null;

            if (this.hideTimer !== null) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }

            stopDelayedShow(this);

            if (this.visible && !inspectorLockedInstances.has(this)) {
                // hide related popups first
                this.relatedPopups.forEach(related => related.hide());

                // hide popup itself
                openedPopups.splice(openedPopups.indexOf(this), 1);
                this.lastTriggerEl = null;
                this.el.remove();
                this.unfreeze();

                if (openedPopups.length === 0) {
                    window.removeEventListener('resize', hideOnResize);
                }
            }
        }

        hideIfEventOutside({ target, type }: Event) {
            // the feature is disabled or inspect mode is enabled (i.e. inspecting views)
            if (this.hideIfEventOutsideDisabled || inspectorLockedInstances.has(this)) {
                return;
            }

            // event inside a trigger element
            if (this.lastTriggerEl && this.lastTriggerEl.contains(target as Node)) {
                if (!this.hideOnTriggerClick || type !== 'click') {
                    return;
                }
            }

            // event inside a popup or its related popups
            if (findTargetRelatedPopup(this, target as Node)) {
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

            this.el = null as unknown as HTMLElement;
            this.lastTriggerEl = null;
            this.lastHoverTriggerEl = null;
        }
    };

    host.view.Popup = Popup;
};
