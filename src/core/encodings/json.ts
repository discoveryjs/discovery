import type { Encoding } from '../utils/load-data.js';
import { parseChunked } from '@discoveryjs/json-ext';

export const encoding = /* @__PURE__ */ Object.freeze({
    name: 'json',
    test: () => true,
    streaming: true,
    decode: iterator => parseChunked(iterator, { mode: 'auto' })
}) satisfies Encoding as Encoding;
