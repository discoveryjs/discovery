import * as base64 from './base64.js';
import * as compare from './compare.js';
import copyText from './copy-text.js';
import * as dom from './dom.js';
import * as html from './html.js';
import * as layout from './layout.js';
import safeFilterRx from './safe-filter-rx.js';

export default {
    base64,
    ...compare,
    copyText,
    ...dom,
    ...html,
    ...layout,
    safeFilterRx
};
