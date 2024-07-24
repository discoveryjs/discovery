# Encodings

Discovery.js allows the configuration of custom encodings in addition to the default ones. Encodings are utilized during payload loading to decode the payload into a JavaScript object. An encoding configuration is defined by an object with these properties:

- `name`: A unique string identifier for the encoding.
- `test`: A function that receives the first chunk of the payload and a `done` flag (indicating whether more payload is expected or if it's complete) and returns a boolean to indicate if the encoding is applicable.
- `streaming` (optional, defaults to `false`): Determines if the encoding supports streaming processing.
- `decode`: A function that decodes the payload into a JavaScript value. It accepts an async iterator if `streaming` is `true`, or `Uint8Array` otherwise.

The TypeScript type definition for an encoding is as follows:

```ts
type Encoding = {
    name: string;
    test(chunk: Uint8Array): boolean;
} & ({
    streaming: true;
    decode(iterator: AsyncIterableIterator<Uint8Array>): Promise<any>;
} | {
    streaming: false;
    decode(payload: Uint8Array): any;
});
```

Encodings can be set using the `encodings` option in `Model`, `Widget` and `App` configurations. The [Loading Data API](./load-data.md) applies the specified encodings to the data payload, and `Model` (base class for `App` and `Widget`) integrates these encodings into its `loadData*` method calls if they are specified upon initialization.

In addition to `App` and `Widget`, preloaders can pass the `encodings` configuration to a data loader if specified in `loadDataOptions`.

Custom encodings are applied before the default encodings, which are, in order of application:

- `jsonxl` (`snapshot9`), non-streaming
- `json` (utilizing `@discoveryjs/json-ext`), streaming

Example of a custom encoding:

```js
new App({
    encodings: [
        {
            name: 'lines/counter',
            test: () => true, // Always applicable
            streaming: false,
            decode: (payload) => new TextDecoder().decode(payload).split('\n').length
        }
    ]
});
```
