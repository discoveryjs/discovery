import type { Encoding } from '../utils/load-data.js';
import { parseChunked } from '@discoveryjs/json-ext';

export const encoding = Object.freeze({
    name: 'json',
    test: () => true,
    streaming: true,
    decode: parseChunked
}) satisfies Encoding as Encoding;
