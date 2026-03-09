/* eslint-env browser */

import { createElement, passiveCaptureOptions } from '../core/utils/dom.js';
import { pointerXY } from '../core/utils/pointer.js';
import { resetViewTreeScrollTopBeforeSelect, viewTree } from './inspector/view-tree.js';
import { propsConfigView } from './inspector/props-config.js';
import { dataView } from './inspector/data.js';

// Return the visible bounding rect of a node in viewport coordinates,
// clipped against every scrollable ancestor.
function getClippedViewportRect(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;

    if (!el) {
        return null;
    }

    let { top, left, right, bottom } = el.getBoundingClientRect();
    let parent = el.parentElement;

    while (parent) {
        const style = getComputedStyle(parent);

        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
            const pr = parent.getBoundingClientRect();
            const clipLeft = pr.left + parent.clientLeft;
            const clipTop = pr.top + parent.clientTop;
            const clipRight = clipLeft + parent.clientWidth;
            const clipBottom = clipTop + parent.clientHeight;

            left = Math.max(left, clipLeft);
            top = Math.max(top, clipTop);
            right = Math.min(right, clipRight);
            bottom = Math.min(bottom, clipBottom);
        }

        parent = parent.parentElement;
    }

    return { top, left, right, bottom, width: right - left, height: bottom - top };
}

// Walk the view tree and return the deepest view leaf whose node contains targetEl.
function findLeafForElement(leaves, targetEl) {
    let result = null;

    const walk = (leafs) => {
        for (const leaf of leafs) {
            if (leaf.node && (leaf.view || leaf.viewRoot)) {
                const container = leaf.node.nodeType === 1 ? leaf.node : leaf.node.parentElement;

                if (container && container.contains(targetEl)) {
                    result = leaf;
                }
            }

            if (leaf.children.length) {
                walk(leaf.children);
            }
        }
    };

    walk(leaves);
    return result;
}

export default (host) => {
    let inspectorActivated = false;
    let lastHoverViewTreeLeaf = null;
    let selectedTreeViewLeaf = null;
    let hideTimer = null;

    const detailsSidebarLeafExpanded = new Set();

    // --- canvas for drawing the highlight box ---
    const canvasEl = createElement('canvas');
    canvasEl.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1999';
    const ctx = canvasEl.getContext('2d');

    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        canvasEl.width = window.innerWidth * dpr;
        canvasEl.height = window.innerHeight * dpr;
        canvasEl.style.width = window.innerWidth + 'px';
        canvasEl.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redrawHighlight();
    };

    const drawHighlight = (leaf) => {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        if (!leaf?.node) {
            return;
        }

        const rect = getClippedViewportRect(leaf.node);

        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return;
        }

        const isViewRoot = Boolean(leaf.viewRoot);
        const isDark = host.colorScheme?.value === 'dark';
        const { top, left, width, height } = rect;

        ctx.save();

        if (isViewRoot) {
            ctx.fillStyle = isDark ? 'rgba(106, 0, 204, 0.2)' : 'rgba(106, 0, 204, 0.3)';
            ctx.strokeStyle = isDark ? 'rgba(111, 74, 152, 0.65)' : 'rgba(54, 0, 102, 0.4)';
        } else {
            ctx.fillStyle = isDark ? 'rgba(0, 200, 0, 0.2)' : 'rgba(0, 255, 0, 0.3)';
            ctx.strokeStyle = isDark ? 'rgba(128, 200, 128, 0.65)' : 'rgba(0, 128, 0, 0.4)';
        }

        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.fillRect(left, top, width, height);
        ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
        ctx.restore();
    };

    const redrawHighlight = () => drawHighlight(selectedTreeViewLeaf || lastHoverViewTreeLeaf);
    const clearHighlight = () => ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // --- capture layer: full-screen transparent div that blocks pointer events ---
    const cancelHintEl = createElement('div', 'cancel-hint view-alert view-alert-warning');
    const captureLayerEl = createElement('div', {
        class: 'discovery-view-inspector-overlay',
        onclick: (e) => {
            if ((e.metaKey || e.ctrlKey) && lastHoverViewTreeLeaf) {
                const view = lastHoverViewTreeLeaf.view.config.view;

                disableInspect();
                host.setPage('views-showcase', view);

                return;
            }

            selectTreeViewLeaf(
                lastHoverViewTreeLeaf && !selectedTreeViewLeaf ? lastHoverViewTreeLeaf : null
            );
        }
    }, [cancelHintEl]);

    // --- leaf lookup at a viewport point ---
    const findLeafAt = (x, y) => {
        const domRoot = host.dom.container.getRootNode();
        // elementsFromPoint returns all elements at the point top-to-bottom, including
        // those occluded by the capture layer, so we can safely filter our own elements out.
        const target = [...(domRoot.elementsFromPoint(x, y) || [])]
            .find(el => el !== captureLayerEl && !captureLayerEl.contains(el) && el !== canvasEl);

        if (!target) {
            return null;
        }

        const tree = host.view.getViewTree([popup.el]);
        return findLeafForElement(tree, target);
    };

    const updateState = () => {
        if (!inspectorActivated || selectedTreeViewLeaf !== null) {
            return;
        }

        const { x, y } = pointerXY.value;
        onHover(findLeafAt(x | 0, y | 0));
    };

    const keyPressedEventListener = (e) => {
        if (e.key === 'Escape' || e.keyCode === 27 || e.which === 27) {
            host.inspectMode.set(false);
        }
    };

    const enableInspect = () => {
        if (!inspectorActivated) {
            inspectorActivated = true;
            resizeCanvas();
            document.addEventListener('scroll', redrawHighlight, passiveCaptureOptions);
            document.addEventListener('keydown', keyPressedEventListener, true);
            window.addEventListener('resize', resizeCanvas);
            pointerXY.subscribe(updateState);
            host.dom.container.append(canvasEl, captureLayerEl);
            updateState();
            host.inspectMode.set(true);
        }
    };

    const disableInspect = () => {
        if (inspectorActivated) {
            inspectorActivated = false;
            document.removeEventListener('scroll', redrawHighlight, passiveCaptureOptions);
            document.removeEventListener('keydown', keyPressedEventListener, true);
            window.removeEventListener('resize', resizeCanvas);
            pointerXY.unsubscribe(updateState);
            inspectByQuick = false;
            delete cancelHintEl.dataset.alt;
            canvasEl.remove();
            captureLayerEl.remove();
            hide();
            host.inspectMode.set(false);
        }
    };

    const selectTreeViewLeaf = (leaf) => {
        selectedTreeViewLeaf = leaf || null;

        if (leaf) {
            const { innerWidth, innerHeight } = window;
            const { left, top, width, height } = popup.el.getBoundingClientRect();

            // lock current popup's position
            popup.el.style.top = `${top}px`;
            popup.el.style.left = `${left}px`;
            popup.el.style.right = `${innerWidth - (left + width)}px`;
            popup.el.style.bottom = `${innerHeight - (top + height)}px`;
            popup.frozen = true;

            // use rAF to make a transition work
            requestAnimationFrame(() => {
                drawHighlight(leaf);
                clearTimeout(hideTimer);
                popup.show();
                popup.freeze();
            });

            delete cancelHintEl.dataset.alt;
        } else if (inspectByQuick) {
            host.inspectMode.set(false);
        } else {
            detailsSidebarLeafExpanded.clear();
            resetViewTreeScrollTopBeforeSelect();
            clearHighlight();
            hide();
            updateState();
        }
    };

    const hide = () => {
        clearHighlight();
        lastHoverViewTreeLeaf = null;
        selectedTreeViewLeaf = null;
        popup.hide();
    };

    const onHover = (leaf) => {
        if (leaf === lastHoverViewTreeLeaf) {
            return;
        }

        if (leaf !== null && lastHoverViewTreeLeaf !== null && leaf.view === lastHoverViewTreeLeaf.view) {
            return;
        }

        lastHoverViewTreeLeaf = leaf;

        if (leaf === null) {
            hideTimer = setTimeout(hide, 100);
            return;
        }

        clearTimeout(hideTimer);
        drawHighlight(leaf);
        popup.show();
    };

    //
    // popup
    //
    const popup = new host.view.Popup({
        className: 'discovery-inspect-details-popup',
        position: 'pointer',
        hideIfEventOutside: false,
        hideOnResize: false,
        render(el) {
            const targetLeaf = selectedTreeViewLeaf || lastHoverViewTreeLeaf;
            const stack = [];
            let cursor = targetLeaf;

            while (cursor !== null && (cursor.view || cursor.viewRoot)) {
                if (cursor !== targetLeaf && selectedTreeViewLeaf !== null) {
                    detailsSidebarLeafExpanded.add(cursor);
                }

                stack.unshift(cursor);
                cursor = cursor.parent;
            }

            return host.view.render(el, {
                view: 'context',
                modifiers: [viewTree(el, {
                    selectTreeViewLeaf,
                    detailsSidebarLeafExpanded
                })],
                content: {
                    view: 'context',
                    modifiers: {
                        view: 'block',
                        className: 'toolbar',
                        content: [
                            {
                                view: 'toggle-group',
                                className: 'stack-view-chain',
                                name: 'view',
                                data: '.({ value: $ })',
                                value: '=$[-1].value',
                                toggleConfig: {
                                    className: [
                                        data => data.value.viewRoot ? 'view-root' : false,
                                        data => data.value.view && data.value.view.skipped ? 'skipped' : false
                                    ],
                                    content: [
                                        'text:value | viewRoot.name or view.config.view | is string ?: "ƒn"'
                                        // {
                                        //     view: 'list',
                                        //     when: false, // postponed for future releases
                                        //     className: 'data-flow-changes',
                                        //     data: `
                                        //         $self: value | viewRoot or view;
                                        //         $parent: value.parent | viewRoot or view or #.host;
                                        //         ['data', 'context'].[$parent[$] != $self[$]]
                                        //     `,
                                        //     whenData: true,
                                        //     itemConfig: {
                                        //         view: 'block',
                                        //         className: data => data,
                                        //         content: 'text:$[0]'
                                        //     }
                                        // }
                                    ]
                                }
                            },
                            {
                                view: 'button',
                                when: selectedTreeViewLeaf !== null,
                                content: 'text:"Close inspector"',
                                onClick() {
                                    host.inspectMode.set(false);
                                }
                            }
                        ]
                    },
                    content: [
                        propsConfigView,
                        {
                            view: 'block',
                            className: ['content', 'data-context'],
                            content: [
                                dataView,
                                {
                                    view: 'block',
                                    className: 'content-section context',
                                    data: '$[-1] | view or viewRoot',
                                    content: {
                                        view: 'struct',
                                        expanded: 1,
                                        data: 'context'
                                    }
                                }
                            ]
                        }
                    ]
                }
            }, stack, {
                selectedView: selectedTreeViewLeaf,
                host
            });
        }
    });

    // attach to host
    host.action.define('startInspect', enableInspect);
    host.action.define('stopInspect', disableInspect);
    host.inspectMode.subscribeSync(
        enabled => enabled ? enableInspect() : disableInspect()
    );

    //
    // quick inspection
    //
    let inspectByQuick = false;
    // document.addEventListener('keydown', quickInspect, true);
    // document.addEventListener('keyup', quickInspect, true);
    // function quickInspect(e) {
    //     if (e.key === 'Alt' || e.keyCode === 18 || e.which === 18) {
    //         if (e.type === 'keydown') {
    //             if (!inspectorActivated) {
    //                 inspectByQuick = true;
    //                 cancelHintEl.dataset.alt = true;
    //                 host.inspectMode.set(true);
    //             }
    //         } else {
    //             if (inspectByQuick && !selectedTreeViewLeaf) {
    //                 inspectByQuick = false;
    //                 delete cancelHintEl.dataset.alt;
    //                 host.inspectMode.set(false);
    //             }
    //         }
    //     }
    // }
};
