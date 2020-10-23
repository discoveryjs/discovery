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
    let lastHoverView = null;
    let hideTimer = null;
    let syncOverlayTimer;
    let lastPointerX;
    let lastPointerY;
    let selectedView = null;

    const viewByEl = new Map();
    const overlayByViewNode = new Map();
    const overlayLayerEl = createElement('div', {
        class: 'discovery-view-inspector-overlay',
        onclick() {
            selectView(lastHoverView && !selectedView ? lastHoverView : null);
        }
    });
    const syncOverlayState = debounce(() => {
        // don't sync change a view selected
        if (!enabled || selectedView !== null) {
            return;
        }

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
        onHover([...document.elementsFromPoint(lastPointerX | 0, lastPointerY | 0) || []]
            .find(el => viewByEl.has(el)) || null
        );
        overlayLayerEl.classList.remove('pick-element');
    };
    const mouseMoveEventListener = ({ x, y }) => {
        lastPointerX = x;
        lastPointerY = y;
        syncOverlayState();
    };
    const keyPressedEventListener = (e) => {
        if (e.keyCode === 27 || e.which === 27) {
            host.inspect(false);
        }
    };
    const enableInspect = () => {
        if (!enabled) {
            enabled = true;
            syncOverlayTimer = setInterval(syncOverlayState, 500);
            host.dom.container.append(overlayLayerEl);
            document.addEventListener('pointermove', mouseMoveEventListener, passiveCaptureOptions);
            document.addEventListener('scroll', syncOverlayState, passiveCaptureOptions);
            document.addEventListener('keydown', keyPressedEventListener, true);
        }
    };
    const disableInspect = () => {
        if (enabled) {
            hide();
            enabled = false;
            clearInterval(syncOverlayTimer);
            overlayLayerEl.remove();
            document.removeEventListener('pointermove', mouseMoveEventListener, passiveCaptureOptions);
            document.removeEventListener('scroll', syncOverlayState, passiveCaptureOptions);
            document.removeEventListener('keydown', keyPressedEventListener, true);
        }
    };
    const selectView = (view) => {
        selectedView = view || null;
        popup.el.classList.toggle('has-selected-view', selectedView !== null);

        if (!view) {
            popup.hide();
            syncOverlayState();
        }
    };

    const popup = new host.view.Popup({
        className: 'discovery-inspect-details-popup',
        position: 'pointer',
        hideIfEventOutside: false,
        hideOnResize: false
    });
    const hide = () => {
        if (lastOverlayEl) {
            lastOverlayEl.classList.remove('hovered');
        }

        lastHoverView = null;
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

        if (leaf.view === lastHoverView) {
            return;
        }

        lastHoverView = leaf.view;
        clearTimeout(hideTimer);

        const stack = [];
        let cursor = leaf;

        while (cursor !== null && cursor.view) {
            stack.unshift(cursor);
            cursor = cursor.parent;
        }
        popup.show(null, (el) => {
            host.view.render(el, {
                view: 'context',
                modifiers: [
                    {
                        view: 'tree',
                        className: 'sidebar',
                        expanded: currentLeaf => !currentLeaf.parent || stack.find(item => item.node === currentLeaf.node),
                        item: 'text:view.config.view or "Root"',
                        itemConfig: {
                            className: currentLeaf => currentLeaf === leaf ? 'tree-path-selected' : ''
                        },
                        data: '.pick(size() - 1)..parent[:-1][-1]'
                    }
                ],
                content: {
                    view: 'context',
                    modifiers: {
                        view: 'toggle-group',
                        className: 'stack-view-chain',
                        name: 'view',
                        data: '.({ text: view.config.view, value: $ })',
                        value: '=$[-1].value'
                    },
                    content: {
                        view: 'block',
                        className: 'inspect-details-content',
                        data: '#.view',
                        content: [
                            {
                                view: 'block',
                                className: 'config',
                                content: [
                                    {
                                        view: 'struct',
                                        expanded: 1,
                                        data: 'view.config'
                                    }
                                ]
                            },
                            {
                                view: 'block',
                                className: 'data',
                                content: [
                                    {
                                        view: 'struct',
                                        expanded: 1,
                                        data: 'view.data'
                                    }
                                ]
                            },
                            {
                                view: 'block',
                                className: 'context',
                                content: [
                                    {
                                        view: 'struct',
                                        expanded: 1,
                                        data: 'view.context'
                                    }
                                ]
                            }
                        ]
                    }
                }
            }, stack, {});
        });
    };

    host
        .on('inspect-enabled', enableInspect)
        .on('inspect-disabled', disableInspect);

    if (host.inspectMode) {
        enableInspect();
    }
};
