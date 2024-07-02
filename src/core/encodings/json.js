import { parseChunked } from '@discoveryjs/json-ext';

export default Object.freeze({
    name: 'json',
    test: () => true,
    streaming: true,
    decode: parseChunked
});
