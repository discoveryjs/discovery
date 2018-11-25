import * as base64 from './base64.js';
import * as html from './html.js';
import defined from './defined.js';
import safeFilterRx from './safe-filter-rx.js';

export default {
    base64,
    ...html,
    defined,
    safeFilterRx
};
