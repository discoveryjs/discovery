import type { Encoding } from '../utils/load-data.js';
import { decode, isHeaderAcceptable as test } from './jsonxl-snapshot9.js';

export const encoding = Object.freeze({
    name: 'jsonxl/snapshot9',
    test,
    streaming: false,
    decode
}) satisfies Encoding as Encoding;
