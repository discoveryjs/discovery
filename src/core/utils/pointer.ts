import { passiveCaptureOptions } from './dom.js';
import { Observer } from '../observer.js';

export const pointerXY = /* @__PURE__*/ (() => {
    const lastPointerXYPublisher = new Observer({ x: 0, y: 0 }, (newCoords, oldCoords) =>
        newCoords.x !== oldCoords.x || newCoords.y !== oldCoords.y
    );

    document.addEventListener(
        'pointermove',
        ({ x, y }) => lastPointerXYPublisher.set({ x, y }),
        passiveCaptureOptions
    );

    return lastPointerXYPublisher.readonly;
})();
