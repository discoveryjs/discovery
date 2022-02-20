import { passiveCaptureOptions } from './dom.js';
import Publisher from '../publisher.js';

const lastPointerXYPublisher = new Publisher({ x: 0, y: 0 }, (newCoords, oldCoords) =>
    newCoords.x !== oldCoords.x || newCoords.y !== oldCoords.y
);

document.addEventListener(
    'pointermove',
    ({ x, y }) => lastPointerXYPublisher.set({ x, y }),
    passiveCaptureOptions
);

export const pointerXY = lastPointerXYPublisher.readonly;
