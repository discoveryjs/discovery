/* eslint-env browser */
const { documentElement } = document;
const standartsMode = document.compatMode === 'CSS1Compat';
const defaultOptions = {
    hoverTriggers: null,
    hoverElementToOptions: el => el
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

class Popup {
    constructor(options) {
        this.options = {
            ...defaultOptions,
            ...options
        };

        this.el = document.createElement('div');
        this.el.className = 'discovery-view-popup';

        this.hide = this.hide.bind(this);
        this.hideIfEventOutside = this.hideIfEventOutside.bind(this);
        this.hideTimer;

        this.hoverTriggerEl = null;

        if (this.options.className) {
            this.el.classList.add(this.options.className);
        }

        if (this.options.hoverTriggers) {
            document.addEventListener('mouseenter', ({ target }) => {
                const triggerEl = this.el.contains(target)
                    ? this.el
                    : target !== document && target.closest(this.options.hoverTriggers);

                if (triggerEl) {
                    this.hideTimer = clearTimeout(this.hideTimer);

                    if (triggerEl !== this.hoverTriggerEl) {
                        this.hoverTriggerEl = triggerEl;

                        if (triggerEl !== this.el) {
                            this.show(
                                triggerEl,
                                this.options.hoverElementToOptions.call(this, triggerEl)
                            );
                        }
                    }
                }
            }, true);

            document.addEventListener('mouseleave', ({ target }) => {
                if (this.hoverTriggerEl && this.hoverTriggerEl === target) {
                    this.hoverTriggerEl = null;
                    this.hideTimer = setTimeout(this.hide, 100);
                }
            }, true);
        }
    }

    show(triggerEl, options) {
        const { render, xAnchor } = options || {};
        const box = getBoundingRect(triggerEl, document.body);
        const viewport = document.body.getBoundingClientRect();
        const availHeightTop = box.top - viewport.top - 3;
        const availHeightBottom = viewport.bottom - box.bottom - 3;
        const availWidthLeft = box.left - viewport.right - 3;
        const availWidthRight = viewport.right - box.left - 3;

        this.hideTimer = clearTimeout(this.hideTimer);

        if (availHeightTop > availHeightBottom) {
            // show to top
            this.el.style.maxHeight = availHeightTop + 'px';
            this.el.style.top = 'auto';
            this.el.style.bottom = (viewport.bottom - box.top) + 'px';
        } else {
            // show to bottom
            this.el.style.maxHeight = availHeightBottom + 'px';
            this.el.style.top = box.bottom + 'px';
            this.el.style.bottom = 'auto';
        }

        if (xAnchor === 'right') {
            // show to left
            this.el.style.left = 'auto';
            this.el.style.right = (viewport.right - box.right) + 'px';
            this.el.style.maxWidth = availWidthLeft + 'px';
        } else {
            // show to right
            this.el.style.left = box.left + 'px';
            this.el.style.right = 'auto';
            this.el.style.maxWidth = availWidthRight + 'px';
        }

        if (typeof render === 'function') {
            this.el.innerHTML = '';
            render(this.el);
        }

        if (this.lastTriggerEl) {
            this.lastTriggerEl.classList.remove('discovery-view-popup-active');
        }

        triggerEl.classList.add('discovery-view-popup-active');
        this.lastTriggerEl = triggerEl;

        if (!this.visible) {
            window.addEventListener('resize', this.hide);
            document.addEventListener('scroll', this.hideIfEventOutside, true);
            document.addEventListener('click', this.hideIfEventOutside, true);

            document.body.appendChild(this.el);
            this.visible = true;
        }
    }

    hide() {
        if (this.visible) {
            window.removeEventListener('resize', this.hide);
            document.removeEventListener('scroll', this.hideIfEventOutside, true);
            document.removeEventListener('click', this.hideIfEventOutside, true);

            this.el.remove();
            this.lastTriggerEl.classList.remove('discovery-view-popup-active');
            this.hoverTriggerEl = null;
            this.hideTimer = clearTimeout(this.hideTimer);
            this.visible = false;
        }
    }

    hideIfEventOutside(event) {
        // event inside a trigger element
        if (this.lastTriggerEl && this.lastTriggerEl.contains(event.target)) {
            return;
        }

        // event inside a popup itself
        if (this.el.contains(event.target)) {
            return;
        }

        // otherwise hide a popup
        this.hide();
    }
}

export default function(discovery) {
    discovery.view.Popup = Popup;
};
