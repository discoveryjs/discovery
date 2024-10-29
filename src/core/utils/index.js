import * as containerStyles from './container-styles.js';
import * as base64 from './base64.js';
import * as compare from './compare.js';
import { copyText } from './copy-text.js';
import { debounce } from './debounce.js';
import * as dom from './dom.js';
import * as html from './html.js';
import { injectStyles } from './inject-styles.js';
import * as types from './is-type.js';
import * as json from './json.js';
import * as layout from './layout.js';
import * as dataLoad from './load-data.js';
import * as objectUtils from './object-utils.js';
import * as pattern from './pattern.js';
import * as persistent from './persistent.js';
import * as pointer from './pointer.js';
import { Progressbar } from './progressbar.js';
import { safeFilterRx } from './safe-filter-rx.js';
import * as size from './size.js';

export default {
    ...containerStyles,
    base64,
    ...compare,
    copyText,
    ...dataLoad,
    debounce,
    ...dom,
    ...html,
    injectStyles,
    ...types,
    ...objectUtils,
    ...json,
    ...layout,
    pattern,
    persistent,
    ...pointer,
    Progressbar,
    safeFilterRx,
    ...size
};
