import { parseChunked } from '@discoveryjs/json-ext';
import type { Encoding } from '../utils/load-data.js';

export default Object.freeze({
    name: 'json',
    test: () => true,
    streaming: true,
    decode: parseChunked
}) satisfies Encoding;
