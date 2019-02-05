/* eslint-env browser */
const { documentElement } = document;
const standartsMode = document.compatMode === 'CSS1Compat';
const openedPopups = [];
const hoverPinModes = [false, 'popup-hover', 'trigger-click'];
const defaultOptions = {
    hoverTriggers: null,
    hoverElementToOptions: el => el,
    hoverPin: false
};

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

        if (this.options.className) {
            this.el.classList.add(this.options.className);
        }

        if (!hoverPinModes.includes(this.options.hoverPin)) {
            console.warn(`Bad value for \`Popup#options.hoverPin\` (should be ${hoverPinModes.join(', ')}):`, this.options.hoverPin);
            this.options.hoverPin = false;
        }

        if (this.options.hoverTriggers) {
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
                        this.lastHoverTriggerEl = triggerEl;

                        // show only if event target isn't a popup
                        if (!targetRelatedPopup) {
                            if (this.options.hoverPin !== 'popup-hover') {
                                this.el.classList.add('no-hover');
                            }

                            this.show(
                                triggerEl,
                                this.options.hoverElementToOptions.call(this, triggerEl)
                            );
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
                    if (this.lastHoverTriggerEl && this.lastHoverTriggerEl.contains(event.target)) {
                        this.el.classList.remove('no-hover');
                        this.lastHoverTriggerEl = null;
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

    show(triggerEl, options) {
        const { render } = options || {};
        const box = getBoundingRect(triggerEl, document.body);
        const viewport = document.body.getBoundingClientRect();
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
            this.el.style.top = box.bottom + 'px';
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
            this.el.style.left = box.left + 'px';
            this.el.style.right = 'auto';
            this.el.style.maxWidth = availWidthRight + 'px';
            this.el.dataset.hTo = 'right';
        }

        this.hideTimer = clearTimeout(this.hideTimer);

        if (typeof render === 'function') {
            this.el.innerHTML = '';
            render(this.el);
        }

        if (this.lastTriggerEl) {
            this.lastTriggerEl.classList.remove('discovery-view-popup-active');
        }

        triggerEl.classList.add('discovery-view-popup-active');
        this.lastTriggerEl = triggerEl;

        // always append since it can pop up by z-index
        document.body.appendChild(this.el);

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

            // hide related popups
            this.relatedPopups.forEach(related => related.hide());
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
