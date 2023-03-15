# Upload data extension

To enable upload data feature:

```js
import { App, Widget, upload, navButtons } from '@discoveryjs/discovery';

// App
const myapp = new App({ upload: true }); // or the same as for Widget

// Widget
const myapp = new Widget({
    extensions: [
        upload,
        navButtons.loadData
    ]
});
```

This will setup all the things to load and unload data to/from an app using file input or drag&drop file:
- `preset/upload` (i.e. `{ view: 'preset/upload' }`)

<img width="324" alt="preset/upload (light)" src="https://user-images.githubusercontent.com/270491/225347231-ee9402cc-a8ea-46dd-8d9d-d46fa8410791.png#gh-light-mode-only"/><img width="324" alt="preset/upload (dark)" src="https://user-images.githubusercontent.com/270491/225348583-0f491ccd-8854-4da3-a61f-f76e72aaa8ca.png#gh-dark-mode-only"/>

- `unloadData` action to reset loaded data
- `uploadFile` action to choose a file to use as a data source
    - `uploadFile.fileExtensions` list of allowed file extensions, by default `[".json"]`
    - `uploadFile.mimeTypes` list of allowed file mime types, by default `["application/json"]`
    - `uploadFile.dragdrop` indicates Drag&Drop feature is enabled or not

Actions can be used via `#.actions`:

```
[
    {
        view: 'button',
        onClick: '=#.actions.unloadData',
        content: 'text:"Reset data"'
    },
    {
        view: 'button',
        onClick: '=#.actions.uploadFile',
        content: 'text:"Load data"'
    },

    'h2:"Supported file extensions & mime types"',
    'ul:#.actions.uploadFile | fileExtensions + mimeTypes'
]
```

To specify custom settings:


```js
import { App, Widget, upload, navButtons } from '@discoveryjs/discovery';

// App
const myapp = new App({ upload: { /* options */ } }); // or the same as for Widget

// Widget
const myapp = new Widget({
    extensions: [
        upload.setup({ /* options */ })
    ]
});
```

Options:

- `accept` (default `application/json,.json`) a value used for `<input type="file">`, see [accept attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept) for detail
- `dragdrop` (default `true`) to disable or enable drag&drop feature
