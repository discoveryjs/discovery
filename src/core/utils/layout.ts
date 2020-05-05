/* eslint-env browser */
const { documentElement } = document;
const standartsMode = document.compatMode === 'CSS1Compat';

export function getOffsetParent(node: HTMLElement): Element {
    let offsetParent = node.offsetParent as HTMLElement || documentElement;

    while (offsetParent && offsetParent !== documentElement && getComputedStyle(offsetParent).position === 'static') {
        offsetParent = offsetParent.offsetParent as HTMLElement;
    }

    return offsetParent || documentElement;
}

export function getPageOffset(element?: HTMLElement) {
    let top = 0;
    let left = 0;

    if (element && element.getBoundingClientRect) {
        // offset relative to element
        const rect = element.getBoundingClientRect();

        top = -rect.top;
        left = -rect.left;
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

export function getBoundingRect(element: HTMLElement, relElement: HTMLElement) {
    const offset = getPageOffset(relElement);
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

export function getViewportRect(element: HTMLElement, relElement: HTMLElement) {
    const topViewport = standartsMode ? document.documentElement : document.body;
    let { top, left } = element === topViewport && !relElement
        ? getPageOffset()
        : getBoundingRect(element, relElement);
    let width: number;
    let height: number;

    if (!element || element instanceof Window) {
        width = window.innerWidth || 0;
        height = window.innerHeight || 0;
    } else {
        top += element.clientTop;
        left += element.clientLeft;
        width = element.clientWidth;
        height = element.clientHeight;
    }

    return {
        top,
        left,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
}
