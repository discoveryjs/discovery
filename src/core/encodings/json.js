import parseChunked from '@discoveryjs/json-ext/src/parse-chunked';

export default Object.freeze({
    name: 'json',
    test: () => true,
    streaming: true,
    decode: iterator => parseChunked(() => iterator)
});
