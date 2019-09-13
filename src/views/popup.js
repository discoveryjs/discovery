/* eslint-env browser */
const { documentElement } = document;
const standartsMode = document.compatMode === 'CSS1Compat';
const openedPopups = [];
const hoverPinModes = [false, 'popup-hover', 'trigger-click'];
const defaultOptions = {
    hoverTriggers: null,
    hoverPin: false,
    render: undefined
};

function getOffsetParent(node) {
    let offsetParent = node.offsetParent || documentElement;

    while (offsetParent && offsetParent !== documentElement && getComputedStyle(offsetParent, 'position') == 'static') {
        offsetParent = offsetParent.offsetParent;
    }

    return offsetParent || documentElement;
}

function getOffset(element) {
    let top = 0;
    let left = 0;

    if (element && element.getBoundingClientRect) {
        // offset relative to element
        const relRect = element.getBoundingClientRect();

        top = -relRect.top;
        left = -relRect.left;
    } else {
        // offset relative to page
        if (standartsMode) {
            top = window.pageYOffset || documentElement.scrollTop;
            left = window.pageXOffset || documentElement.scrollLeft;
        } else {
            // quirk mode
            const { body } = document;

            if (element !== body) {
                top = body.scrollTop - body.clientTop;
                left = body.scrollLeft - body.clientLeft;
            }
        }
    }

    return {
        left,
        top
    };
}

function getBoundingRect(element, relElement) {
    const offset = getOffset(relElement);
    let top = 0;
    let left = 0;
    let right = 0;
    let bottom = 0;

    if (element && element.getBoundingClientRect) {
        ({ top, left, right, bottom } = element.getBoundingClientRect());
    }

    return {
        top: top + offset.top,
        left: left + offset.left,
        right: right + offset.left,
        bottom: bottom + offset.top,
        width: right - left,
        height: bottom - top
    };
}

function getTopLeftPoint(element, relElement) {
    const offset = getOffset(relElement);
    let left = 0;
    let top = 0;

    if (element && element.getBoundingClientRect) {
        const box = element.getBoundingClientRect();

        top = box.top;
        left = box.left;
    }

    return {
        top: top + offset.top,
        left: left + offset.left
    };
}

function getViewportRect(element, relElement) {
    const topViewport = standartsMode ? document.documentElement : document.body;
    const point = element === topViewport && !relElement ? getOffset() : getTopLeftPoint(element, relElement);
    let top = point.top;
    let left = point.left;
    let width;
    let height;

    if (!element || element === window) {
        width = window.innerWidth || 0;
        height = window.innerHeight || 0;
    } else {
        top += element.clientTop;
        left += element.clientLeft;
        width = element.clientWidth;
        height = element.clientHeight;
    }

    return {
        top: top,
        left: left,
        right: left + width,
        bottom: top + height,
        width: width,
        height: height
    };
}

function findTargetRelatedPopup(popup, target) {
    if (popup.el.contains(target)) {
        return popup;
    }

    return popup.relatedPopups.reduce(
        (res, related) => res || findTargetRelatedPopup(related, target),
        null
    );
}

function hideIfEventOutside(event) {
    openedPopups.slice().forEach(popup => popup.hideIfEventOutside(event));
}

class Popup {
    constructor(options) {
        this.options = {
            ...defaultOptions,
            ...options
        };

        this.el = document.createElement('div');
        this.el.className = 'discovery-view-popup';

        this.hide = this.hide.bind(this);
        this.hideTimer;

        this.lastTriggerEl = null;
        this.lastHoverTriggerEl = null;
        this.hoverPinned = false;

        if (this.options.className) {
            this.el.classList.add(this.options.className);
        }

        if (!hoverPinModes.includes(this.options.hoverPin)) {
            console.warn(`Bad value for \`Popup#options.hoverPin\` (should be ${hoverPinModes.join(', ')}):`, this.options.hoverPin);
            this.options.hoverPin = false;
        }

        if (this.options.hoverTriggers) {
            this.el.classList.add('show-on-hover');
            this.el.dataset.pinMode = this.options.hoverPin || 'none';

            document.addEventListener('mouseenter', ({ target }) => {
                if (target === document) {
                    return;
                }

                const targetRelatedPopup = findTargetRelatedPopup(this, target);
                const triggerEl = targetRelatedPopup
                    ? targetRelatedPopup.el
                    : target.closest(this.options.hoverTriggers);

                if (triggerEl) {
                    this.hideTimer = clearTimeout(this.hideTimer);

                    if (triggerEl !== this.lastHoverTriggerEl) {
                        // change hover pinned only when trigger is not a popup in pinned mode
                        if (!targetRelatedPopup || !targetRelatedPopup.hoverPinned) {
                            this.lastHoverTriggerEl = triggerEl;
                        }

                        // show only if event target isn't a popup
                        if (!targetRelatedPopup) {
                            this.hoverPinned = false;
                            this.el.classList.remove('pinned');

                            this.show(triggerEl);
                        }
                    }
                }
            }, true);

            document.addEventListener('mouseleave', ({ target }) => {
                if (this.lastHoverTriggerEl && this.lastHoverTriggerEl === target) {
                    this.lastHoverTriggerEl = null;
                    this.hideTimer = setTimeout(this.hide, 100);
                }
            }, true);

            if (this.options.hoverPin === 'trigger-click') {
                document.addEventListener('click', (event) => {
                    if (this.lastHoverTriggerEl && this.lastTriggerEl.contains(event.target)) {
                        this.lastHoverTriggerEl = null;
                        this.hoverPinned = true;
                        this.el.classList.add('pinned');
                        event.stopPropagation();
                    }
                }, true);
            }
        }
    }

    get relatedPopups() {
        return openedPopups.filter(related => this.el.contains(related.lastTriggerEl));
    }

    get visible() {
        return openedPopups.includes(this);
    }

    show(triggerEl, render = this.options.render) {
        const hostEl = document.body;
        const box = getBoundingRect(triggerEl, hostEl);
        const offsetParent = getOffsetParent(hostEl.firstChild);
        const viewport = getViewportRect(window, offsetParent);
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

        this.hideTimer = clearTimeout(this.hideTimer);
        this.relatedPopups.forEach(related => related.hide());

        if (typeof render === 'function') {
            this.el.innerHTML = '';
            render(this.el, triggerEl, this.hide);
        }

        if (this.lastTriggerEl) {
            this.lastTriggerEl.classList.remove('discovery-view-popup-active');
        }

        triggerEl.classList.add('discovery-view-popup-active');
        this.lastTriggerEl = triggerEl;

        // always append since it can pop up by z-index
        hostEl.appendChild(this.el);

        if (!this.visible) {
            openedPopups.push(this);

            window.addEventListener('resize', this.hide);

            if (openedPopups.length === 1) {
                document.addEventListener('scroll', hideIfEventOutside, true);
                document.addEventListener('click', hideIfEventOutside, true);
            }
        }
    }

    hide() {
        this.hideTimer = clearTimeout(this.hideTimer);

        if (this.visible) {
            // hide related popups first
            this.relatedPopups.forEach(related => related.hide());

            // hide popup itself
            openedPopups.splice(openedPopups.indexOf(this), 1);
            this.el.remove();

            if (this.lastTriggerEl) {
                this.lastTriggerEl.classList.remove('discovery-view-popup-active');
                this.lastTriggerEl = null;
            }

            window.removeEventListener('resize', this.hide);

            if (openedPopups.length === 0) {
                document.removeEventListener('scroll', hideIfEventOutside, true);
                document.removeEventListener('click', hideIfEventOutside, true);
            }
        }
    }

    hideIfEventOutside({ target }) {
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
}

export default function(discovery) {
    discovery.view.Popup = Popup;
};
