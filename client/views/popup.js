/* eslint-env browser */
const { documentElement } = document;
const standartsMode = document.compatMode === 'CSS1Compat';

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
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'discovery-view-popup';

        this.hide = this.hide.bind(this);
        this.hideIfEventOutside = this.hideIfEventOutside.bind(this);
    }

    show(triggerEl, options) {
        const { render, xAnchor } = options || {};
        const box = getBoundingRect(triggerEl, document.body);
        const viewport = document.body.getBoundingClientRect();
        const availHeightTop = box.top - viewport.top - 4;
        const availHeightBottom = viewport.bottom - box.bottom - 4;

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

        this.el.style.left = xAnchor === 'right' ? 'auto' : box.left + 'px';
        this.el.style.right = xAnchor === 'right' ? (viewport.right - box.right) + 'px' : 'auto';

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

            document.body.insertBefore(this.el, document.body.firstChild);
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
            this.visible = false;
        }
    }

    hideIfEventOutside(event) {
        if (!this.el.contains(event.target)) {
            this.hide();
        }
    }
}

export default function(discovery) {
    discovery.view.Popup = Popup;
};
