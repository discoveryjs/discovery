/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { getBoundingRect } from '../core/utils/layout.js';

export default (discovery) => {
    const container = discovery.dom.container;
    let lastTargetEl = null;
    let lastView = null;
    let hideTimer = null;
    let overlays = [];
    const popup = new discovery.view.Popup({
        className: 'view-stack-trace'
    });
    const removeOverlays = () => {
        if (overlays) {
            overlays.forEach(el => el.remove());
            overlays = [];
        }
    };
    const hide = () => {
        removeOverlays();
        lastTargetEl = null;
        lastView = null;
        popup.hide();
    };
    const onHover = target => {
        if (target === lastTargetEl) {
            return;
        }

        const stack = discovery.view.getViewStackTrace(lastTargetEl = target);

        if (stack === null) {
            hideTimer = setTimeout(hide, 100);
            return;
        }
        const hoverView = stack[stack.length - 1];

        if (lastView === hoverView) {
            return;
        }

        clearTimeout(hideTimer);
        lastView = hoverView;

        hoverView.nodes.forEach((el, idx) => {
            const box = getBoundingRect(el);
            const overlayEl = overlays[idx] || document.body.appendChild(createElement('div', {
                style: `
                    position: absolute;
                    z-index: 1000;
                    background: rgba(0, 0, 200, .2);
                    pointer-events: none;
                `
            }));

            overlayEl.style.top = `${box.top}px`;
            overlayEl.style.left = `${box.left}px`;
            overlayEl.style.width = `${box.width}px`;
            overlayEl.style.height = `${box.height}px`;
            overlayEl.style.transition = 'all 25ms 5ms ease-out';

            if (idx + 1 > overlays.length) {
                overlays.push(overlayEl);
            }
        });

        overlays.splice(hoverView.nodes.length).forEach(el => el.remove());

        if (hoverView.nodes.length) {
            popup.show(hoverView.nodes[0], (el) => {
                discovery.view.render(el, [
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
        }
    };
    container.addEventListener('mouseenter', ({ target }) => {
        onHover(target);
    }, true);
    container.addEventListener('mouseleave', ({ toElement, relatedTarget }) => {
        onHover(toElement || relatedTarget);
    }, true);
};
