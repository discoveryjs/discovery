import applyContainerStyles from './core/utils/apply-container-styles.js';
import * as base64 from './base64.js';
import * as compare from './compare.js';
import copyText from './copy-text.js';
import debounce from './debounce.js';
import * as dom from './dom.js';
import * as html from './html.js';
import * as json from './json.js';
import * as layout from './layout.js';
import * as dataLoad from './load-data.js';
import * as pattern from './pattern.js';
import * as persistent from './persistent.js';
import * as pointer from './pointer.js';
import progressbar from './progressbar.js';
import safeFilterRx from './safe-filter-rx.js';
import * as size from './size.js';

export default {
    applyContainerStyles,
    base64,
    ...compare,
    copyText,
    ...dataLoad,
    debounce,
    ...dom,
    ...html,
    ...json,
    ...layout,
    pattern,
    persistent,
    ...pointer,
    progressbar,
    safeFilterRx,
    ...size
};
