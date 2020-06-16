/* eslint-env browser */

import { createElement, passiveCaptureOptions } from '../core/utils/dom.js';
import { getBoundingRect } from '../core/utils/layout.js';
import debounce from '../core/utils/debounce.js';

function isBoxChanged(oldBox, newBox) {
    if (oldBox === null) {
        return true;
    }

    for (const prop of ['top', 'left', 'width', 'height']) {
        if (oldBox[prop] !== newBox[prop]) {
            return true;
        }
    }

    return false;
}

export default (host) => {
    let enabled = false;
    let lastOverlayEl = null;
    let lastView = null;
    let hideTimer = null;
    let syncOverlayTimer;
    let lastPointerX;
    let lastPointerY;

    const overlayLayerEl = createElement('div', 'discovery-view-inspector-overlay');
    const overlayByViewNode = new Map();
    const viewByEl = new Map();
    const syncOverlayState = debounce(() => {
        // console.time('syncOverlayState');
        const tree = host.view.getViewTree([popup.el]);
        const overlayToRemove = new Set([...overlayByViewNode.keys()]);
        const walk = function walk(leafs, parentEl) {
            for (const leaf of leafs) {
                const box = getBoundingRect(leaf.node, parentEl);
                let overlay = overlayByViewNode.get(leaf.node) || null;

                if (overlay === null) {
                    overlay = {
                        el: parentEl.appendChild(createElement('div', 'overlay')),
                        box: null
                    };
                    overlayByViewNode.set(leaf.node, overlay);
                    viewByEl.set(overlay.el, leaf);
                } else {
                    overlayToRemove.delete(leaf.node);
                }

                if (isBoxChanged(overlay.box, box)) {
                    overlay.el.style.top = `${box.top}px`;
                    overlay.el.style.left = `${box.left}px`;
                    overlay.el.style.width = `${box.width}px`;
                    overlay.el.style.height = `${box.height}px`;
                    overlay.box = box;
                }

                if (leaf.children.length) {
                    overlay.el.style.overflow = getComputedStyle(leaf.node).overflow !== 'visible' ? 'hidden' : 'visible';
                    walk(leaf.children, overlay.el);
                }
            }
        };

        walk(tree, overlayLayerEl);

        for (const node of overlayToRemove) {
            overlayByViewNode.get(node).el.remove();
            overlayByViewNode.delete(node);
        }
        // console.timeEnd('syncOverlayState');

        updateState();
    }, { maxWait: 0, wait: 50 });
    const updateState = () => {
        overlayLayerEl.classList.add('pick-element');
        onHover([...document.elementsFromPoint(lastPointerX, lastPointerY) || []]
            .find(el => viewByEl.has(el)) || null
        );
        overlayLayerEl.classList.remove('pick-element');
    };
    const mouseMoveEventListener = ({ x, y }) => {
        lastPointerX = x;
        lastPointerY = y;
        syncOverlayState();
    };
    const enableInspect = () => {
        if (!enabled) {
            enabled = true;
            syncOverlayTimer = setInterval(syncOverlayState, 500);
            document.body.append(overlayLayerEl);
            document.addEventListener('pointermove', mouseMoveEventListener, passiveCaptureOptions);
            document.addEventListener('scroll', syncOverlayState, passiveCaptureOptions);
        }
    };
    const disableInspect = () => {
        if (enabled) {
            enabled = false;
            clearInterval(syncOverlayTimer);
            overlayLayerEl.remove();
            document.removeEventListener('pointermove', mouseMoveEventListener, passiveCaptureOptions);
            document.removeEventListener('scroll', syncOverlayState, passiveCaptureOptions);
        }
    };

    const popup = new host.view.Popup({
        className: 'view-stack-trace',
        position: 'pointer'
    });
    const hide = () => {
        if (lastOverlayEl) {
            lastOverlayEl.classList.remove('hovered');
        }

        lastView = null;
        lastOverlayEl = null;

        popup.hide();
    };
    const onHover = overlayEl => {
        if (overlayEl === lastOverlayEl) {
            return;
        }

        if (lastOverlayEl !== null) {
            lastOverlayEl.classList.remove('hovered');
        }

        lastOverlayEl = overlayEl;

        if (overlayEl === null) {
            hideTimer = setTimeout(hide, 100);
            return;
        }

        overlayEl.classList.add('hovered');

        const leaf = viewByEl.get(overlayEl) || null;

        if (leaf.view === lastView) {
            return;
        }

        lastView = leaf.view;
        clearTimeout(hideTimer);

        const stack = [];
        let cursor = leaf;

        while (cursor !== null && cursor.view) {
            stack.unshift(cursor.view);
            cursor = cursor.parent;
        }

        popup.show(null, (el) => {
            host.view.render(el, [
                {
                    view: 'inline-list',
                    className: 'stack-view-chain',
                    item: 'text:config.view'
                },
                {
                    view: 'struct',
                    data: 'pick(size() - 1).({ config, data, context})',
                    expanded: 1
                }
            ], stack, {});
        });
    };

    host
        .on('inspect-enabled', enableInspect)
        .on('inspect-disabled', disableInspect);

    if (host.inspectMode) {
        enableInspect();
    }
};
