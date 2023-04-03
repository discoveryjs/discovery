# Loading data API

This module provides different methods to load data into Discovery.js applications. The public API includes the following functions:

- `loadDataFromStream(stream, options)`
- `loadDataFromEvent(event, options)`
- `loadDataFromFile(file, options)`
- `loadDataFromUrl(url, options)`
- `loadDataFromPush(options)`

Each function accepts an `options` parameter, which is an object containing various settings that affect the behavior of the loader. This article will detail the common options for all functions as well as additional options specific to certain functions. It will also provide a structure for the `dataMeta` option.

## Common options

The following options are available for all the `loadDataFrom*` functions:

- `size` (Number): An optional number representing the total size of the data being loaded (in bytes). If provided, the progress reported by the loader will be more accurate.
- `dataMeta` (Object): An optional object containing meta information about the loaded data, such as its name and creation timestamp. See the [`dataMeta` Structure](#datameta-structure) section for more details.

## Additional options for specific functions

### `loadDataFromUrl(url, options)`

In addition to the [Common Options](#common-options), the `loadDataFromUrl` function accepts the following additional options:

- `isResponseOk` (Function): An optional function that takes a `response` object as an argument and returns a boolean value indicating whether the response is considered successful. Defaults to `(response) => response.ok`.
- `getContentSize` (Function): An optional function that takes a `response` object as an argument and returns the size of the content being loaded. Defaults to a function that returns the value of the `x-file-size` header if present, or the `content-length` header if the URL is of the same origin and there is no `content-encoding` header.
- `getContentCreatedAt` (Function): An optional function that takes a `response` object as an argument and returns the created at timestamp of the content being loaded. Defaults to a function that returns the value of the `x-file-created-at` header if present, or the `last-modified` header otherwise.
- `fetch` (Object): An optional object containing additional options for the `fetch` function, such as `method`, `headers`, `mode`, etc.

## `dataMeta` structure

The `dataMeta` object can contain the following properties:

- `name` (String): An optional name for the loaded data.
- `createdAt` (Date | String | Number): An optional timestamp indicating when the data was created. Can be a `Date` object, a string in a format parseable by the `Date.parse()` method, or a number representing the number of milliseconds since the Unix epoch (January 1, 1970, 00:00:00 UTC).

Example:

```javascript
{
  name: 'Sample Data',
  createdAt: '2023-04-01T12:00:00Z',
}
```
