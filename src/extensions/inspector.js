/* eslint-env browser */

import { createElement, passiveCaptureOptions } from '../core/utils/dom.js';
import { getBoundingRect } from '../core/utils/layout.js';
import { pointerXY } from '../core/utils/pointer.js';
import { debounce } from '../core/utils/debounce.js';
import { resetViewTreeScrollTopBeforeSelect, viewTree } from './inspector/view-tree.js';
import { propsConfigView } from './inspector/props-config.js';
import { dataView } from './inspector/data.js';

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
    let inspectorActivated = false;
    let lastOverlayEl = null;
    let lastHoverViewTreeLeaf = null;
    let selectedTreeViewLeaf = null;
    let hideTimer = null;
    let syncOverlayTimer;

    const detailsSidebarLeafExpanded = new Set();
    const viewByEl = new Map();
    const overlayByViewNode = new Map();
    const cancelHintEl = createElement('div', 'cancel-hint view-alert view-alert-warning');
    const overlayLayerEl = createElement('div', {
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
    const syncOverlayState = debounce(() => {
        // don't sync change a view selected
        if (!inspectorActivated || selectedTreeViewLeaf !== null) {
            return;
        }

        // console.time('syncOverlayState');
        const tree = host.view.getViewTree([popup.el]);
        const overlayToRemove = new Set([...overlayByViewNode.keys()]);
        const walk = function walk(leafs, parentEl) {
            for (const leaf of leafs) {
                // if (leaf.fragmentNodes && leaf.fragmentNodes.length) {
                //     const r = new Range();
                //     r.setStartBefore(leaf.fragmentNodes[0]);
                //     r.setEndAfter(leaf.fragmentNodes[leaf.fragmentNodes.length - 1]);
                //     const { top, left, right, bottom } = r.getBoundingClientRect();
                //     const offset = getPageOffset(parentEl);
                //     const box = {
                //         top: top + offset.top,
                //         left: left + offset.left,
                //         width: right - left,
                //         height: bottom - top
                //     };

                //     const overlay = {
                //         el: parentEl.appendChild(document.createElement('div')),
                //         box: null
                //     };
                //     overlay.el.className = leaf.viewRoot ? 'overlay view-root' : 'overlay';
                //     viewByEl.set(overlay.el, leaf);

                //     overlay.el.style.top = `${box.top}px`;
                //     overlay.el.style.left = `${box.left}px`;
                //     overlay.el.style.width = `${box.width}px`;
                //     overlay.el.style.height = `${box.height}px`;
                // }

                if (!leaf.node || (!leaf.view && !leaf.viewRoot)) {
                    if (leaf.children.length) {
                        walk(leaf.children, parentEl);
                    }

                    continue;
                }

                const box = getBoundingRect(leaf.node, parentEl);
                let overlay = overlayByViewNode.get(leaf.node) || null;

                if (overlay === null) {
                    overlay = {
                        el: parentEl.appendChild(createElement('div', leaf.viewRoot ? 'overlay view-root' : 'overlay')),
                        box: null
                    };

                    if (leaf.node.nodeType === 1) {
                        overlay.el.style.zIndex = getComputedStyle(leaf.node).zIndex;
                    }

                    if (leaf.viewRoot && leaf.viewRoot.inspectable !== false) {
                        overlay.el.dataset.inspectable = true;
                    }

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
                    if (leaf.node.nodeType === 1) {
                        overlay.el.style.overflow = getComputedStyle(leaf.node).overflow !== 'visible' ? 'hidden' : 'visible';
                    }

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
        const { x, y } = pointerXY.value;
        onHover([...host.dom.container.parentNode.elementsFromPoint(x | 0, y | 0) || []]
            .find(el => viewByEl.has(el)) || null
        );
    };
    const keyPressedEventListener = (e) => {
        if (e.key === 'Escape' || e.keyCode === 27 || e.which === 27) {
            host.inspectMode.set(false);
        }
    };
    const enableInspect = () => {
        if (!inspectorActivated) {
            inspectorActivated = true;
            document.addEventListener('scroll', syncOverlayState, passiveCaptureOptions);
            document.addEventListener('keydown', keyPressedEventListener, true);
            pointerXY.subscribe(syncOverlayState);
            syncOverlayTimer = setInterval(syncOverlayState, 500);
            host.dom.container.append(overlayLayerEl);
            syncOverlayState();
            host.inspectMode.set(true);
        }
    };
    const disableInspect = () => {
        if (inspectorActivated) {
            inspectorActivated = false;
            clearInterval(syncOverlayTimer);
            document.removeEventListener('scroll', syncOverlayState, passiveCaptureOptions);
            document.removeEventListener('keydown', keyPressedEventListener, true);
            pointerXY.unsubscribe(syncOverlayState);
            inspectByQuick = false;
            delete cancelHintEl.dataset.alt;
            overlayLayerEl.remove();
            overlayLayerEl.replaceChildren(cancelHintEl); // remove all overlay DOM nodes
            overlayByViewNode.clear(); // reset all overlay nodes
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
                onHover(overlayByViewNode.get(leaf.node)?.el || null);
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
            hide();
            syncOverlayState();
        }
    };
    const hide = () => {
        if (lastOverlayEl) {
            lastOverlayEl.classList.remove('hovered');
        }

        lastOverlayEl = null;
        lastHoverViewTreeLeaf = null;
        selectedTreeViewLeaf = null;

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

        if (leaf === null) {
            lastHoverViewTreeLeaf = null;
            return;
        }

        if (lastHoverViewTreeLeaf !== null && leaf.view === lastHoverViewTreeLeaf.view) {
            return;
        }

        lastHoverViewTreeLeaf = leaf;
        clearTimeout(hideTimer);

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
