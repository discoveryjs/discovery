## next

- Fixed missed render on `unloadData` event when `modelfree` extension is used
- Added visual guide lines for expanded objects in `signature` view, similar to `struct` view
- Fixed rendering of copy source button in `source` view when a string is passed as data
- Added propagation of meaningful `source` view props into nested views rendering (action buttons, prelude, and postlude) through the context as `sourceViewProps`
- Standardized monospace font size and line height in `struct`, `signature` and `source` views to relay on root settings
- Added root CSS properties:
    - `--discovery-monospace-font-size`
    - `--discovery-monospace-line-height`
- Changes in `input` view:
    - Added `htmlStep` option
    - Added props normalization
    - Changed `value` option to no longer be interpreted as a query

## 1.0.0-beta.91 (24-11-2024)

- Changes related to `Model#context`:
    - Added `context` to `Model` options, allowing the model's context to be set and accessible from the beginning (available during setup and in extensions)
    - Added `Model#setContext(context, replace)` method, which extends the current context with the provided value or replaces it if `replace` is `true`
    - Added `context` event to `Model`, with `prevContext` and `nextContext` parameters, triggered when the context changes
    - Changed `Model#context` to be an accessor property, where the setter calls `Model#setContext(value, true)`
    - Changed `ViewModel#setData()` to no longer accept a `context` argument or change the context
    - Changed `ViewModel#setDataProgress()` to no longer change the context, despite accepting `context` argument
    - Updated `ViewModel` to trigger a render when the `context` event is fired
- Added `Model#legacyPrepare` readonly property to indicate whether the legacy `prepare` method is used or the new `setup()` method
- Updated `struct` view to define the `setStructViewAnnotations` action when using the new `setup()` method, allowing custom annotations to be specified across all `struct` views
- Updated `embed` option of `App` to accept a config
- Added `EmbedApp#publicApi.notify(name, details)` method for sending notifications
- Introduced `onNotify(name, details)` option in the embed extension to define a callback for handling `notification` messages from the embed host
- Added `EmbedApp#publicApi.setLocationSync()` method to simplify sync between the embed app and the host location, preventing potential pitfalls
- Added `ViewModel#enforceScheduledRenders()` to immediately execute scheduled renders
- Changed `ViewModel#scheduleRender()` to use `setTimeout()` instead of `Promise.resolve()` to ensure proper processing of event loop tasks, eliminating unnecessary renders
- Changed `ViewModel` initialization to minimize unnecessary renders
- Marked `ViewModel#renderPage()`, `ViewModel#renderSidebar()`, and `ViewModel#renderPage()` as private methods, as they are not intended for direct invocation anymore
- Fixed `ViewModel#setPageParams()` to normalize the `hash` by ensuring it starts with `#`, preventing unnecessary events; for example, passing `#page` and `page` into the method will now consistently result in `#page` being stored in `ViewModel#pageHash`
- Redesigned logging API, the changes allow to see the correct loaction of logging method call instead of a location inside of the `Model#log()` method:
    - Added `Logger` class to utils
    - Changed `Model#logger` to hold a `Logger` instance
    - Removed `Model#logLevel`, use `Model#logger.logLevel` for getting or setting the log level
    - Deprecated `Model#log()` method, which do nothing but display an error:
        - Use `Model#logger[level](...args)` instead of `Model#log('level', ...args)`
        - Use `Model#logger[level].group(message, fn | array)` or `Model#logger[level].groupCollapsed(message, fn | array)` instead of `Model#logger({ level, message, collapsed: fn | array })`

## 1.0.0-beta.90 (15-11-2024)

- Added `@discoveryjs/discovery/embed` export
- Changed `applyContainerStyles()` to take a single `darkmode` value instead of "options", with supported values: `true`, `false`, `'true'`, `'false'`, `'dark'`, `'light'` and `'auto'`
- Changed `applyContainerStyles()` to avoid applying transition styles to the container, preventing unwanted flashes of opposite colors
- Changed `source` view to take `source`, `syntax`, `lineNum`, `refs` and `maxSourceSizeToHighlight` options. It attempts to derive these values from `data` when options are not explicitly provided for backward compatibility. The `source` can be derived from `data` as `content` (for backward compatibility) or `source` property
- Removed `mime`, `binary` and `size` data options for `source` view
- Bumped `marked` to `^14.1.4` (used in `markdown` view)
- Added styles for `<kbd>` in `markdown` view
- Improved string rendering in the values popup of `signature` view
- Fixed optional values statistics in `signature` view
- Fixed navigation history update on the query graph changes on `discovery` page
- Fixed scrollbar color schema in darkmode mode

## 1.0.0-beta.89 (04-11-2024)

- Renamed `Widget` class into `ViewModel`
- Added `pageStateChange` event to `ViewModel`, triggered when `pageId`, `pageRef`, or `pageParams` changes
- Added `query` property to functions produced from a string (jora query), i.e. with `Model#queryFn(query)`
- Added `clipboard` option to the `upload` extension for enabling loading data from the clipboard
- Added support for uploading files from `paste` event
- Added `unloadData` nav button
- Renamed `loadData` nav button into `uploadFile`
- Changed `Model#unloadData()` method to not reset context
- Added `app-header` view
- Model's info:
    - Added `name`, `version`, `description`, and `icon` options for `Model`, storing these values in the `info` property
    - Added `model` property to a render context (result of `ViewModel#getRenderContext()`) reflecting `info` value
    - Added `--discovery-app-icon` CSS custom property which contains value of model's `icon`
- Added `@discoveryjs/discovery/utils` export
- Changed the extension application order for `App` so that `options.extensions` are applied after implicit extensions
- Changed `nav-button` view to align with `button` view (`text`, `href` and `external` as config options, `disabled` is no longer treated as query)
- Modified `PageRenderer#define()` and `ViewRenderer#define()` to allow specifying all options with a single config parameter:
  ```js
  // new signature
  discovery.page.define('example', { render: [/* ... */], ...restOptions });
  // old signature remains compatible
  discovery.page.define('example', [/* ... */], { /* options */ });
  ```
- Removed `export default` in the core modules
- Fixed `Model#pathToQuery()` method to correctly generate a query when part of the path contains a jora keyword
- Fixed an edge case in the `table` view when rendering a single cell with an explicit column setup and row data containing non-object values

## 1.0.0-beta.88 (24-10-2024)

- Added `context` option for all views, which executes before `data` and replaces the input context value with its result
- Added `rows` option for `table` view to specify data for rows, with `data` being used by default if `rows` is not specified
- Added `detailsWhen` option for `table` cells to explicitly control the activation of details
- Changed `button` view to take `text`, `href` and `external` options; it attempts to derive these values from `data` when options are not explicitly provided for backward compatibility
- Changed `button` view so that `disabled` values are no longer treated as queries. To use a query for disabling a button, specify it explicitly like `{ view: "button", disabled: "=query" }`
- Improved the computation of estimated JSON size in the `struct` view actions popup, making it 2x faster
- Fixed behavior of `tooltip` option to display a tooltip with a delay by default
- Fixed TypeScript warning related to `switch` view export due `switch` is reserved word and can't be an identifier

## 1.0.0-beta.87 (15-10-2024)

- Enhanced style of errors on the loading data overlay
- Enhanced responsiveness and addressing issues with freezing during transition states for views related to the data loading state. Instead of setup of initial state via JavaScript, the new `@starting-style` at-rule is used:
    - Tweaked styles to improve the performance perception
    - Widget:
        - Removed adding of `.init` class to the main container in `initDom()`
    - App:
        - Removed adding of `.init` class to the overlay during the initialization phase
    - Progressbar:
        - Added adding `.done` and `.error` classes on the main container on progressbar finish
        - Removed `delay` option from the constructor
        - Removed `appearanceDelay` property
        - Removed adding `.init` class to the main container at the first stage change
- Changed `createLoadDataState()` to take a dataset factory function instead of a load data request, enhancing its reusability
- Fixed re-rendering on data unload
- Fixed `Model#decodePageHash()` to return `null` for `pageRef` instead of `undefined`
- Fixed `Widget#setPageHash()` to always emit `hashChanged` when `hash` changes, disregarding changes of `pageId`, `pageRef` and `pageParams`
- Fixed preloader styles to ensure the data loading progressbar remains visible during the prepare stage
- Fixed value counting in the `signature` view when a property contains duplicated objects, which previously led to incorrect `optional` label
- Fixed warning "Added non-passive event listener..." in Chrome caused by CodeMirror (https://github.com/codemirror/codemirror5/issues/6735)
- Fixed missed error on progressbar's value when the progressbar finishes with error
- Removed missed `console.log()` in progressbar

## 1.0.0-beta.86 (27-09-2024)

- Added `setWorkTitle` method to the prepare context API to display additional text on the progress bar:
```js
export function async prepare(input, { setWorkTitle }) {
    await setWorkTitle('phase 1');
    // ...
    await setWorkTitle('phase 2');
    // ...
}
```
- Refactor `Progressbar`:
    - Added `setStateStep(step)` method to set a secondary text for the stage
    - Changed `setState()` method to take second optional parameter `step`
    - Modified logic for await repainting
    - Added `awaitRepaintPenaltyTime` property to indicate time spending on awaiting for repaint
    - Changed `onFinish` callback to add `awaitRepaintPenaltyTime` to `timings` array
    - Added `decoding` stage
    - Renamed `receive` stage into `receiving`
    - Removed `lastStage` as it redundant, use `value.stage` instead
- Changes in data loading:
    - Added `decoding` stage for load state
    - Renamed `receive` stage into `receiving` for load state
    - Added `loadingTime` and `decodingTime` into dataset timings
- Fixed crashing the entire render tree on an exception in a view's `render` function; now, crashes are isolated to the affected view
- Fixed unnecessary view rendering when returning to the discovery page
- Fixed hiding a popup with `hideOnResize: true` when scrolling outside of the popup element
- Fixed load data timings section title in console
- Added TypeScript typings for `Popup`

## 1.0.0-beta.85 (15-09-2024)

- Changed `Widget#scheduleRender()` to schedule render for all subjects when no subject is specified (invoked without parameters)
- Bumped jora to [1.0.0-beta.13](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.13)
- Added display of tens marks in `struct` view
- Added new actions for expanded values in the `struct` view:
  > These actions activate when certain actions are available in the context. First, if the `queryAcceptChanges` action exists and returns a truthy value for the `struct`'s data (root value), then specific actions like `querySubquery` and `queryAppend` are checked for existence. If they exist, the relevant actions are added to the actions menu. These actions should take a `path` and `struct` view data and make relevant changes to the query that the current `struct` view instance is based on. The `discovery` page provides such actions in the context, so any `struct` view that takes query editor output as its input data provides these actions.
  - **"Create a subquery from the path"** – calls the `querySubquery` action from the context (i.e., `#.action.querySubquery`), which creates on the `discovery` page a new node in the query graph with the selected path.
  - **"Append path to current query"** – calls the `queryAppend` action, which appends on the `discovery` page the selected path to the current query in the query editor.
- Changes for `table` view:
    - Changed rendering of arrays when it's a row value, to render as other non-object values using `struct` view
    - Renamed `scalarCol` option into `valueCol`
    - Tweaked styles to dim the display of `true`, `false`, `null`, `NaN`, and `Infinity` values to differentiate them from strings and numbers
    - Changed in the `cols` configuration:
        - Added the `colWhen` option (like `when` or `whenData`) for the `table` view to conditionally render columns based on the table's data
        - Added the `contentWhen` option (like `when` or `whenData`) for `table-cell` to conditionally render cell content based on the cell's data
        - Changed the `when` and `whenData` options to behave as regular options for the `table-cell` view:
            - Previously, `when` canceled column rendering; now `colWhen` should be used instead
            - Previously, `whenData` canceled cell content rendering; now `contentWhen` (the `table-cell` option) should be used instead

## 1.0.0-beta.84 (05-09-2024)

- Introduced the `Model` class as a base for `Widget` and `App`:
    - Added a new `setup` option for configuring model-related aspects during initialization (immutable during the lifecycle), such as object markers, additional query methods, etc.
    - Implements `loadDataFrom*` methods, so all the classes able to load data now
- Added handling of empty payload on data loading (raise an error "Empty payload")
- Added `props` options for a view definition, a function (or a string as a jora query) `(data, { props, context}) => any` which should return a normalized props
- Added additional block into inspector popup to display normalized props when `view.options.props` is specified
- Added `overrideProps(obj)` jora helper method which overrides object's values (current) with values from passed `obj` (`#.props` by default)
- Changed `getReadableStreamFromSource()` util function to use a `Blob` to produce a `ReadableStream` from a value
- Changed `loadDataFrom*()` functions to return `{ state, dataset }` object instead of `{ state, result }` (renamed `result` into `dataset`)
- Modified the `link`, `text`, `text-numeric` and `text-match` views to allow all render props to be passed via config, in addition to data
- Tweaked the `source` view to display tabs as 4 spaces (`tab-size: 4`)
- Added `onClick` option for `badge` views
- Removed `hint` option for `badge` views, use `tooltip` option instead
- Removed fallback methods for obtaining a `ReadableStream` from a `Blob`
- Fixed resolving a value for main content for `badge` views
- Fixed crashing the entire render tree on an exception in a `data` query; now, crashes are isolated to the affected view
- Fixed discovery page main content styling
- Bumped jora to [1.0.0-beta.12](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.12)

## 1.0.0-beta.83 (03-04-2024)

- Added `encodings` option for `App`, `Widget` (has no effect for now), preloader (via `loadDataOptions`) and [Loading Data API](./load-data.md) (see [Encodings](./docs/encodings.md))

## 1.0.0-beta.82 (20-03-2024)

- Rebranded the "report page" as the "discovery page"
    - Changed text on button `Make report` → `Discover`
    - Changed page slug `report` → `discovery`
    - Added redirect for locations `#report...` → `#discovery...`, use `Widget.options.intoreportToDiscoveryRedirect` to disable it
    - `Widget#reportPageId` → `Widget#discoveryPageId`, with default `discovery` instead of `report`
    - `Widget.options.reportPageId` → `Widget.options.discoveryPageId`
    - `navButtons.reportPage` → `navButtons.discoveryPage`, button's `name` changed into `discovery-page`
    - CSS classes:
        - `.report-*` → `.discovery-*`
        - `.discovery-editor` → `.discovery-view-editor`
- Added `positionMode` option for `popup` view. When set to "natural", the popup attempts to position itself at the bottom right side if dimensions allow, instead of positioning towards the larger available space by default (value "safe" for the option)
- Added `pointerOffsetX` and `pointerOffsetY` options for `popup` view and `view.tooltip`
- Enabled `positionMode: natural` for tooltips by default, can be changed via tooltip options
- Exposed type checking helpers `isArray()`, `isSet()` and `isRegExp()`
- Fixed `badge` view options when it receives an array as data
- Fixed `struct` view annotation styling to avoid treating `href` values as links when they are falsy
- Fixed a sticky tooltip for "Enable view inspection" button on inspecting start
- Fixed the delayed popup display after calling the `hide()` method
- Fixed positioning of popups with `position: pointer`
- Fixed animation of the inspector's details popup when transitioning into full-screen mode

## 1.0.0-beta.81 (06-03-2024)

- Added basic support for `TypedArray`s and `Set` values in `struct`, `signature` and `table` views
- Added `'only'` value for `darkmode` option of `Widget` & `App`, which forces to use dark mode with no option for a user to switch to light mode
- Added `scalarCol` option for `table` view to display the row value as the first cell
- Added a thousandth delimiter for text in annotations in `struct` view
- Removed an annotation of scalar values by object markers in `struct` view by default. To enable it, the `annotateScalars: true` option must be set explicitly on object marker definition
- Modified the badge view to enable passing all options via config, in addition to data
- Fixed the highlighting of Jora assertions
- Fixed displaying supported syntaxes in view's showcase for `source` view
- Fixed passing context to `table` view when rendered in `struct` view
- Exposed used CodeMirror for extension purposes via a static property `CodeMirror` of `QueryEditor` and `ViewEditor`, e.g. `discovery.view.QueryEditor.CodeMirror.defineMode('my-mode', ...)`

## 1.0.0-beta.80 (21-01-2024)

- Fixed the highlighting of Jora assertions when the assertion is the same as a literal keyword
- Fixed updating of an expanded query output in query editor
- Fixed the issue with displaying popups using `showDelay` when the pointer moves over nested trigger elements before coming to a stop
- Improved view inspecting of popups
- Bumped jora to [1.0.0-beta.10](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.10)

## 1.0.0-beta.79 (29-10-2023)

- Reworked report page to support query graph and other improvements
- Uniformed font and size for monospace views
- Enlarged action buttons in `struct` and `structure` views
- Improved UX for signature popup displaying in `struct` view
- Changed rendering of after-annotations to render in a prelude when a value is expanded
- Changed default rendering of arrays in a table cell to display number of array elements instead of `[…]`
- Added separate colors for keywords and assertions in a query editor
- Added a 3-second delay for enabling view inspect mode when the "inspect" button is clicked with the Cmd (⌘) or Ctrl key (useful for tooltips, context menus etc.)
- Added `Widget#view.attachTooltip(el, config, data, context)` method
- Added `Popup#showDelay` option to control the behavior of popup appearance. The option specifies the delay in milliseconds after the pointer stops moving over a trigger before the popup is displayed. By default, there is no delay. When set to true, the default delay of 300 milliseconds is applied. If a positive number is provided, it is used as the delay, while other values are treated as 0, resulting in an immediate show.
- Added third parameter for `Popup#show()` method, when set to a truthy value it specifies to bypass show delay if any
- Removed `Popup#options` in favor of properties
- Fixed editor to not render text until gets focus
- Fixed suggestion popup positioning in query editor in some cases
- Modified `Widget` to utilize deep comparison for page params, ensuring more accurate detection of changes
- Fixed query editor to not suggest a variant which exactly equals to current text
- Fixed `Widget#log()` method where it would crash when attempting to output a single collapsed error
- Added "Copy report as page hash" button
- Fixed "Copy report permalink" button being always disabled
- Fixed `defaultPage` option to have no effect
- Bumped jora to [1.0.0-beta.9](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.9)

## 1.0.0-beta.78 (21-09-2023)

- Bumped jora to [1.0.0-beta.8](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.8): assertions and dozens of new methods
- Tweaked error output on app & data loading

## 1.0.0-beta.77 (27-07-2023)

- Exposed `createLoadDataState()` method as utils
- Introduced internal logging subsystem:
    - Added `Widget#log()` method
    - Added `logLevel` option for `Widget` and `App`. Supported values: `silent`, `error`, `warn`, `info`, `perf` (default) and `debug`. To disable any logging set `logLevel` to `silent`
    - Added `logger` option (default to `console`) to override an interface for a logging. Setting to falsy value will disable any logging
- Fixed displaying "Empty list" in view showcase when a view has no examples
- Fixed calling `onFinish()` callback on `Progressbar` getting an error
- Fixed an exception on unsubscribing from progressbar state sync on loading data error
- Fixed "uncaught error in promise" on data load failure in preloader
- Removed deprecated option `title` in `expand` view config
- Removed warning on definition `resolveLink()` method in page config

## 1.0.0-beta.76 (10-07-2023)

- Added `limitCompactObjectEntries` and `maxPropertyLength` options to `struct` view
- Added `prelude` and `postlude` slots (new options in config) for `source` view
- Added `sectionPrelude` and `sectionPostlude` for `markdown` view to define view config to render in the beggining of the section (right after a header) or in the end of the section (before next header or end of source)
- Added `codeConfig` option for `markdown` view to specify a config for code block rendering
- Removed `codeActionButtons` option for `markdown` view, use `codeCofig.actionButtons` instead
- Changed markup of `source` view:
    - Wrapped `action-buttons`, `lines` and `source` blocks into `view-source__content` block
    - Added `view-source__` prefix for class names of `action-buttons`, `lines` and `source` blocks
    - Added auto scrolling for `source` view content when size of source block is restricted
    - Fixed positioning for actions block when content overflows
- Improved styles of the expanded section line in `struct` view to no longer rely on paddings used
- Fixed rendering of truncated urls in `struct` view
- Fixed `table` view rendering when a column content defined as a view shorthand with config, e.g. `view{ prop: 1 }`
- Fixed context value for `beforeDemo`, `demo` and `afterDemo` sections in usage render

## 1.0.0-beta.75 (15-06-2023)

- Added `.jsonxl` to list of default extensions for upload
- Improved markdown syntax highlighting in `source` view
- Added "Copy to clipboard" button to `source` view
- Added `actionButtons` option for `source` view to add extra buttons (or any views) before "Copy to clipboard" button
- Added `codeActionButtons` option for `markdown` view to pass it as is to `source` view used to render code blocks in markdown

## 1.0.0-beta.74 (06-04-2023)

- Fixed preloader init when no data specified

## 1.0.0-beta.73 (05-04-2023)

- Fixed `loadDataFromStream()` and `loadDataFromFile()` methods when no `options` parameter is specified
- Fixed "data collected at" date displaying on a report page
- Fixed `#.actions` availability for an App's overlay rendering

## 1.0.0-beta.72 (05-04-2023)

- Made internal navigation using anchors (`<a>` tags) work without router extension enabled. Use `ignore-href` class on an anchor to prevent navigation by `href` attribute if needed
- Added `permalink` action to generate current state of an app (absolute page URL by default), it can be overridden by embedding host
- Changed `Widget#setPageHash()` to make leading `#` optional, i.e. `Widget#setPageHash('#report')` and `Widget#setPageHash('report')` give the same result now
- Embed API:
    - Reworked internals for more efficient data transfer, e.g. transfer a data stream intead of tranfering data with chunks
    - Replaced `App#loadData` with `App#uploadData(source, extractResourceMetadata)` method, which takes source instead of a function returning a source
    - Added `setRouterPreventLocationUpdate()` method for preloader and app to prevent location updates (and browser's history as well) on internal navigation
    - Added `setPageHash()` method for preloader embed API
- Reworked loading data API and internals:
    - Added support for loading binary encoded data (jsonxl snapshot 9)
    - Added `Widget#datasets` and `#.datasets` to store loaded datasets (data itself and its meta data as an object). Current APIs assume to work with a single dataset (data), so this list contains zero or one element for now. However, future version will allow to load and work with multiple datasets (still need to think about the details)
    - Added `dataset` option in `Widget#setData()` method options to provide dataset's attributes, which is optional and a dataset object will has `data` field only if the option is not provided
    - Added `start(resource)` method to `loadFromPush()` API
    - Changed loading data logic to always expect raw data and meta info specified aside (via `options`) if provided (see release notes for details)
    - Changed preloader to pass `loadDataOptions` into all the loading methods as `options`
    - Changed `Widget#setDataProgress(data, context, progressbar)` signature into `setDataProgress(data, context, options)`, where `options` is an object `{ dataset?, progressbar? }`
    - Removed `#.name` and `#.createdAt`, use `#.datasets[].resource | { name, createdAt }` instead
    - Removed `data` from `Windget#context`, however, `data` is still available in a render context as `data` of default dataset, i.e. `#.data` which the same as `#.datasets[].data`
    - Removed `Widget#dataLoaded` and `#.dataLoaded` flags, use `Widget#hasDatasets()` method or `#.datasets` in jora queries
    - Changes in `loadDataFromUrl()` method:
        - Changed `getContentSize` option to not take `url` parameter anymore
        - Changed the default `getContentSize` handler to prefer `X-File-Size` header over `Content-Length` header
        - Added `getContentCreatedAt` option to specify a function to retrieve `createdAt` from a fetch's response (by default, retrieve a value from the `X-File-Created-At` header if present, or `Last-Modified` header otherwise)
        - Added `getContentEncodedSize` option
        - Fixed a potential crash on JSON parse for a bad response with `application/json` content type
        - Removed `dataField` option
        - Removed support for loading raw data using this function
- Removed `Widget#lib`

## 1.0.0-beta.71 (20-03-2023)

- Added `embed` extension to provide a communication with a host in case when an app is loaded into iframe
- Added `embed` support for  to pass `loadDataOptions` into all the loading methods as `options`
- Added `dist/discovery-embed-host.js` into package, a ESM module which provides an API to communicate with an app loaded into a sandbox (iframe)
- Added `setup()` method for `upload` extension to specify custom settings
- Added `#.actions.uploadFile.dragdrop` to indicate drag&drop file supported or not (provided by `upload` extension)
- Added `startLoadData`, `startSetData` and `unloadData` events
- Added `callAction(name, ...args, callback?)` and `actionHandler(name, ...args, callback?)` jora helpers, the `callback` is applying to handle a result of an action call when specified
- Changed `tooltip` to use evaluated value instead of raw config value
- Changed `Progressbar` to be inherited from `Publisher`
- Replaced `Widget#actions` with `Widget#action` which is a dictionary, i.e. now available `Widget#action.define(name, callback)`, `Widget#action.revoke(name)`, `Widget#action.call(name, ...args)` and the rest methods of `Dict` (actions also available via `#.actions` in jora queries)
- Fixed `markerAll()` jora helper
- Fixed `upload` options setting
- Fixed applying twice the extensions passed via `App`'s options
- Fixed suggestions for context value (`#`) in report's query editor
- Tweaked nested list styles in `markdown` view
- Removed obsoleted methods:
    - `Widget#addEntityResolver()`
    - `Widget#addValueLinkResolver()`
    - `Widget#addBadge()`
    - `Widget#addQueryHelpers()`

## 1.0.0-beta.70 (10-10-2022)

- Added new options for usage sections: `demoData`, `highlight` and `highlightProps`
- Improved the view inspector to display entire data flow transitions
- Changes for annotations in `struct`:
    - Accept strings and functions in `annotations` option (beside `{ query: ... }` notation)
    - Changed `debug` option to take a string value which will be used in debug messages
    - Added `#.context` for annotation's queries to have an access to `struct`'s context
    - Added `tooltip` option
    - Removed `title` option

## 1.0.0-beta.69 (29-09-2022)

- Implemented `tooltip` as a view wide option
- Changes in `source` view
    - Added `maxSourceSizeToHighlight` option
    - Added `tooltip` option for refs, e.g. `source:{ refs: [{ range: [1, 4], tooltip: "struct" }] }`
    - Tweaked styles for refs
    - Removed `error` option
    - Removed `disabled` option

## 1.0.0-beta.68 (05-09-2022)

- Fixed copy to clipboard in FireFox

## 1.0.0-beta.67 (09-08-2022)

- Added `type: module` to `package.json`
- Fixed suggestions in query editor when a pattern contains upper case letters
- Uniformed number delimeter insertion in all places, added a HTML escaping and fixed pattern matching
- Fixed testing a string is URL in `struct` view to accept dashes in a domain name
- Fixed an unnecessary caught exception on the lib loading
- Added `darkmode` attribute on a preloader container when dark mode is used
- Removed `dataField` parameter in `loadDataFromUrl()` method, this parameter might be passed via `options`
- Added option `loadDataOptions` in preloader's config to pass it as `options` to load data methods
- Changed `Widget` constructor from `Widget(container, defaultPage, options)` to `Widget(options)`, `container` and `defaultPage` values can be specified via `options` as `options.container` and `options.defaultPage` respectively
- Changed `App` constructor from `App(container, options)` to `App(options)`, `container` value can be specified via `options` as `options.container`
- Changed `App`'s default value for `container` option to `document.body`
- `styles` option of `Widget` & `App`:
    - Added `"inline"` and `"external"` as aliases for `"style"` and `"link"` respectively
    - Added support for `media` attribute for inline styles in `styles` option of `Widget` & `App`, e.g.
        ```js
        new App({
            styles: [
                { type: 'style', content: '...', media: 'all and (max-width: 1000px)' }
            ]
        })
        ```

## 1.0.0-beta.66 (14-07-2022)

- Added `text-numeric` view
- Added `alert-primary` view
- Added `destroy()` method to Popup view
- Added `external` data option for `badge` views
- Added `version` to library exports
- Added Discovery.js credits into nav popup
- Allowed `className` in `view{ config }` notation
- Changed `className` in view config to take a string starting with `=` as a query, e.g. `{ view: 'block', className: '=query' }`
- Eliminated unnecessary query execution and view rendering on a report page when changing non-affecting page params. As a side effect page params `query`, `view`, `title`, `dzen` and `noedit` are not available for the main query and views anymore
- Changes in `struct` view:
    - Added a view as table for array and object values
    - Added a thousandth delimiter for all numeric indicators
    - Added `allowedExcessStringLength`, `maxStringLength`, `maxCompactStringLength` and `maxCompactPropertyLength` options
    - Fixed a crush on open actions popup view when a value has too much nested structure
- Changes in `table` view:
    - Added `scalarAsStruct` and `colSpan` config options to `table-cell`
    - Added `cols` and `isScalar()` to the `table-row`'s context
    - Changed rendering of scalar values using `struct` view
    - Changed rendering of `null` value as `null` string instead of an empty cell
    - Fixed rendering of arrays when object values mixed with scalar values
    - Fixed collapsing a row height when all cells are empty
    - Hide a more buttons row when no buttons (gave a few extra pixels in the bottom of a table)
- Uniformed a monospace font family across all views
- Fixed suggestions in query editor to suggest values with the same quotes as a pattern string
- Fixed highlighting issues in `source` view
- Bumped jora to [1.0.0-beta.7](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.7)

## 1.0.0-beta.65 (18-04-2022)

- Fixed "copy text to clipboard" feature to use a fallback in case of `clipboard-write` permission is not granted (#90)
- Reduced init time of `Widget` by lazy init for the report page views, i.e. init views only when the report page is opened for the first time
- Tweaked `source` view styles
- Fixed badge views styles to change a color on hover only when `href` attribute is set
- Fixed exception when `lookup()` method of object marker is called with an unknown type, return `undefined` instead
- Fixed hanging up when a pattern matches zero-length substring (i.e. in `input` view with type `regexp`)
- Fixed edge cases in displaying an error location in query editor
- Bumped jora to [1.0.0-beta.6](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.6)
- Improved performance of variants generation for suggestions popup up to 30-40 times
- Changed suggestions behaviour in query editor to be less intrusive
- Changed style for suggestions popup, use icons for value types instead of captions
- Fixed report page header editing to not re-render a report on input

## 1.0.0-beta.64 (15-02-2022)

- Fixed loading stage order
- Improved accuracy for loading timings log
- Fixed loading progressbar appearance delay, i.e. no more visible progressbar when data instantly loaded
- Fixed setting of `data` on `context` when a prepare handler returns a new value, before changes `context.data` contained a reference to an original (loaded) value, for now `Widget#context.data` is always equal to `Widget#data` after a `loadData()` call
- Fixed action buttons on data load error page
- Added `preset/upload`
- Added a way to customise error message rendering on data load: if an error has a `renderContent` property its value is using as a config for rendering instead of default "red box"
- Added `rejectData(message, renderContent)` method to `prepare` handler API, for a rejecting data due to a bad format or other reasons
- View inspector:
    - Displayed data changes in case a `config.data` is used
    - Added `D` and `C` badges in sidebar when `data` or `context` of the view is different with a parent view
    - Fixed unnecessary sidebar scrolling on view selection
- Changed a behaviour when a preset is not found, for now just render nothing instead of warning badge
- Removed `mode` from context and a `modelfree` specific logic (with a single exception for special in routing, will be removed in next releases)

## 1.0.0-beta.63 (07-02-2022)

- Bumped dependencies to latest versions (fixes security issues)
- Fixed `popup` view to auto hide when trigger elements are removing from a document
- Fixed progress bar state update on data loading after a discovery instance init
- Removed `App.modelfreeLoadData()` method, use `App#loadDataFromEvent()` or `#.actions.upload` instead
- Added `Widget#unloadData()` method to reset loaded data and context if any
- Added `#.dataLoaded` property to indicate is data loaded or not
- Generalized approach to upload data:
    - API exposed as an extension which can be imported as `import { upload } from '@discoveryjs/discovery'` and configured via `options.upload`
    - Turns on automatically when `options.upload` is truthy for `App`
    - Options supported for `options.upload`:
        - `accept` (`"application/json,.json"` when ommited) – specify accept attribute for file selection inputs
        - `dragdrop` (`true` when ommited) – enable "drop file to load data" feature
- Added `Widget#actions` (available as `#.actions` in jora queries) dictionary for special actions:
    - `startInspect` and `stopInspect` when inspector is applied
    - `uploadFile` and `unloadData` when `upload` extension is applied
- `markdown` view:
    - Added support for simple text interpolation using `{{ query }}` syntax
    - Added support for array of strings as `source` value
    - Fixed table cell styling
    - Tweaked styles for list and checkbox
- Tweaked styles for nested list views
- Added thousandth delimiter for default rendering of a number in `table` view cell

## 1.0.0-beta.62 (14-10-2021)

- Fixed code highlighting in `source` view
- Added alias `jora` for `discovery-query` syntax (used in `source` and `markdown`)
- Added anchor support for headers and `anchor` option to enable it
- Added anchor support for headers in `markdown` view and `anchors` option to disable it
- Changed `hstack` to use flexbox for layout
- Added `image` view
- Changed `image-preview` to behave as `image` but with chess background
- Added `lineNum` option to the `source` view
- Fixed position highlighting in query editor on lexical error

## 1.0.0-beta.61 (31-03-2021)

- Fixed preloader's block disability in some cases due to underlaying
- Fixed hanging on `push` mode loading when no data is provided (model-free mode build as a single file)
- Removed style's applying to a container on `App` init
- Changed `Widget`'s init to set a container last
- Exposed `navButtons` as extensions: `indexPage`, `reportPage`, `loadData`, `inspect` and `darkmodeToggle`

## 1.0.0-beta.60 (19-03-2021)

- Fixed report page vertical scrolling issue when a pointer over an editor
- Added `data-page` attribute on widget's root with current `pageId` as a value
- Changed layout to rely on `--discovery-page-padding-top/right/bottom/left` custom properties

## 1.0.0-beta.59 (10-03-2021)

- Fixed view's editor layout on report page when viewport is too narrow

## 1.0.0-beta.58 (05-03-2021)

- Fixed `source` view supported syntaxes to list modes with no mime
- Fixed editor's hint popup positioning when widget is not fit into the page bounds
- Added `options` parameter for `loadDataFromUrl()` with following options:
    - `fetch` – is passing as is into `fetch()` as second argument
    - `isResponseOk(response)` – a function to check response is ok
    - `getContentSize(url, response)` - a function to determine a size of decoded content
    - `validateData(data)` - a function to check payload is valid response data, must throw an error if data is invalid
- Changed `Widget#setContainer()` to append only if container is an instance of `Node`

## 1.0.0-beta.57 (04-03-2021)

- Fixed regression in `struct` view when click events aren't handled
- Added `--discovery-nav-height` as compliment for `--discovery-nav-width`
- Added `Widget#nav.replace()` method
- Exposed (re-export) `inspector` default exports
- Added `inspector` option for `Widget` to allow disable inspector if needed
- Added `router` option for `App` to allow disable router if needed
- Added `resolveValueLinks()` and `query()` methods to prepare handler API (i.e. `discovery.setPrepare((data, { resolveValueLinks, query }) => ...)`)
- Added `rollbackContainerStyles()` util function

## 1.0.0-beta.56 (01-03-2021)

- Fixed extra params encoding on `report` page
- Added base64 encoding/decoding for extra params when parameter name ends with `-b64` on `report` page

## 1.0.0-beta.55 (17-02-2021)

- Added "Views showcase" to header of view editor form on report page
- Exposed `injectStyles()` helper
- Added `progress` view
- Removed Shadow DOM usage in `progressbar` and re-use `progress` styles
- Changed preloader to create a container (with Shadow DOM) for its content
- Added `styles` option for preloader, the same as for `Widget`/`App` constructors
- Added `lib/preloader.css` and `dist/discovery-preloader.css` to the package

## 1.0.0-beta.54 (15-02-2021)

- Fixed premature render when `Widget#setDataProgress()` is used, which resulted in double page rendering
- Fixed double report page rendering on data load in `model-free` mode
- Fixed crash on Chromium when process is running with strict CSP settings, due to false positive detection of `localStorage` access (local variable `localStorage` was renamed into something neutral)
- Fixed extra newline at the ending of code blocks in `markdown` view

## 1.0.0-beta.53 (05-02-2021)

- Reworked to use `esbuild` for bundling
- Reworked to use Shadow DOM for style and event isolation
- Added preloader (`lib/preloader.js` and `dist/discovery-preloader.js`)
- Removed quick inspection mode for now, due to annoying in various use cases
- Added JSON parser from `json-ext` library, that's adds support for JSON greater than 512MB on V8
- Improved UX when data loading from a file by showing progress bar
- Added `App#loadDataFromStream()` and `App#loadDataFromFile()` methods
- Added `unsubscribe` as a second parameter for publisher's subscriber handler
- Changed `source` view to highligh using CodeMirror only
- Enabled `source` view syntaxes can be observed on `#views-showcase:source` page
- Removed `Prismjs` and related dependencies
- Moved `source` view to regular views, dropped `complexViews` from exports

## 1.0.0-beta.52 (19-11-2020)

- Added experimental `proxy` option for `context` view
- Changed `page-header` view to pass `onInit` and `onChange` through to children
- Various style fixes

## 1.0.0-beta.51 (14-11-2020)

- Added aliases `off` and `disable` for `disabled` to disable darkmode
- Fixed burger button visibility when no items in menu
- Fixed quick inspect mode enter/leave issues
- Fixes & tweaks in styles

## 1.0.0-beta.50 (11-11-2020)

- Fixed regression in broken build due to missed `marked` module in `browser` configuration
- Fixed prefix rendering in `badge` views

## 1.0.0-beta.49 (11-11-2020)

- Added `markdown` view (and `md` alias) based on [marked](https://github.com/markedjs/marked)
- Bumped jora to [1.0.0-beta.5](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.5)
- Fixed inspector popup styles when discovery's root element is not `<body>`

## 1.0.0-beta.48 (04-11-2020)

- Fixed dark mode styles of action buttons in `struct` view for touch devices
- Fixed context for nav to include route attributes (#70)
- Added `nav.remove(name)` method to remove nav items (#72)
- Removed try/catch in `Widget#queryBool()`, so now `when` and `whenData` throws instead of silently fail (#69)
- Fixed missing horizontal scrolling for `tree` view
- Fixed postfix style in `badge` view when used in `page-header`'s prelude
- Fixed `source` view crashing on highlighting
- Fixed path generation in `signature` view for objects in dictionary mode
- Allowed to pass a space separated strings to `className`
- Changed behaviour for a function as `className` value, it's return value can be a string or an array (any other is ignored)
- Improved output view as a function in View inspector
- Fixed view's tree in View inspector for components with no a container
- Added display of non-rendered views with the reason in the view's tree in View inspector
- Fixed jump out `context`'s content on re-render in view tree of View inspector
- Bumped jora to `1.0.0-beta.4` and use `setup()` method (a bit more effective in creating functions from strings)

## 1.0.0-beta.47 (02-11-2020)

- Added View inspector
- Changed nav block to be fixed positioned
- Changed nav block class name `.discovery-content-badges` -> `.discovery-nav`
- Added `.page_overscrolled` class name that's adding to a page element when page's content scrolled over viewport top side
- Added `page-header` view
- Added `passive` option support detection test and `passiveCaptureOptions` for `addEventListener()` in `utils.dom`
- Added `position` option for `popup` view with possible values `trigger` (by default) and `pointer` (to set position according to pointer coordinates)
- Added `hideOnResize` and `hideIfEventOutside` options for `popup` view (both `true` by default)
- Added `Popup#freeze()` and `Popup#unfreeze()` methods
- Added `onClick` option for link view
- Added `ignoreCase` option to `text-match` view
- Fixed various edge cases for `text-match` view
- Fixed markup for `tree-leaf` view in non-collapsible state
- Fixed data for `toggle` view when used in `toggle-group`
- Removed margin reset for header views when first child of block
- Exposed internal helpers as `utils`: `debounce`, `contentRect`, `jsonStringifyInfo`, `jsonStringifyAsJavaScript`, `persistent`, `pattern` and `pointerXY` modules

## 1.0.0-beta.46 (23-10-2020)

- Added `dropdown` view
- Changed index and report page buttons to behave like a link (#34)
- Changed marker of darkmode is enabled from attribute `data-darkmode` to class `.discovery-root-darkmode`
- Fixed darkmode state restoring from localStorage on init
- CSS fixes

## 1.0.0-beta.45 (21-10-2020)

- Fixed crash when `localStorage` is not available (e.g. due CSP restrictions)
- Fixed `darkmode` and `darkmodePersistent` settings for `App` to use defaults when coresponding values in options are `undefined`
- Fixes for modelfree and dark mode

## 1.0.0-beta.44 (21-10-2020)

- Added option to control localStorage usage for darkmode state
- Fixed dark mode switching in editor's hint popups
- `text-match` view
    - Added support for a string as match pattern
    - Removed requirement for parentheses in regexp patterns
- `badge` views
    - Added `hint` data option to show tooltip with a hint

## 1.0.0-beta.43 (20-10-2020)

- Introduced dark color scheme a.k.a. dark mode. Various fixes and improvements in views markup and styles
- Improved loading progress overlay repaints to avoid freezing when document became inactive
- Added `Widget#pathToQuery(path)` method
- Added `toggle` and `toggle-group` views
- Changed a bit default page in model free mode
- Fixed `children` option ignorance in `itemConfig` when `limitLines` is used for `tree` view
- Fixed `href` option to work for `button` view
- Fixed path generation in `signature` details
- Fixed context for `Widget#nav.menu` item rendering

## 1.0.0-beta.42 (08-10-2020)

- Exposed `lookupObjectMarker(value, type?)` and `lookupObjectMarkerAll(value)` methods to prepare handler
- Added `Widget#queryFn(query)` method
- Added `Widget#queryToConfig(query)` method (uses internally for extracting config from a string)
- Isolated view defined props  and pass it to view's render. That means that special properties (`view`, `when`, `data`, `whenData`, `className` and `postRender`) aren't passing to a view's render now
- Added queryable values in view's config. A queryable value is a string that starts with `=`, e.g. `{ view: 'list', limit: '= size() > 13 ? 10 : false' }` will show entire list if its size <= 13, otherwise show by chunks of 10 items
- Added in-string configuration for views, e.g. `"list{ limit: size() > 13 ? 10 : false, item: 'auto-link' }"` will be converted into `{ view: 'list', limit: '=size() > 13 ? 10 : false', item: 'auto-link' }`
- Made header on report page sticky positioned
- Fixed view rendering breaking on data query processing
- Fixed `Symbol()` stringifying in `struct` view
- Fixed overlapping a selection by view name spotlighting in view editor
- Fixed report scroll jumping on typing in an editor due to change in rendered content height
- Fixed `table` view rendering crash on column order detection
- Fixed auto-sorting for a table view column with both `data` and `content` in config

## 1.0.0-beta.41 (06-10-2020)

- Reworked data loading progress bar to respect `Content-Encoding` and `X-File-Size` headers
- Fixed styles for `h3`, `h4` and `h5` views

## 1.0.0-beta.40 (04-10-2020)

- Fixed regression of non-expandable cells with implicit details (i.e. for objects) in `table` view

## 1.0.0-beta.39 (02-10-2020)

- Fixed patching for `prismjs@^1.21.0`
- Bumped jora to `1.0.0-beta.3`
- Introduced view's showcase page (`#views-showcase`)
- Core
    - Improved error handling in data prepare handler
    - Display data loading progress
    - Reworked navigation panel and introduced `Widget#nav` API
    - Removed `Widget#addBadge()` method (use `Widget#nav` API instead)
    - Added `Widget#setPageRef()` method
    - Added optional `postRender()` method in view config, which is useful for final decoration
    - Fixed empty entry (i.e. `{ "": true }`) in `#.params` when page's route has no params
- Report page
    - Improved syntax highlighting in editors
    - Added known view highlighting in view editor
    - Fixed loss of functions, regexps and dates on view source formatting on report page
    - Improved available views presentation
- Changes in views:
    - `alert`
        - Changed variations to have `.view-alert` class
        - Fixed CSS styles
    - `block`
        - Removed missed styles, it affected `<h2>` by legacy reasons
    - `button`
        - Added support for `href` and `external` values in `data`, which ignores when button is disabled or `onClick` is specified
        - Don't apply `onClick` when button is disabled
        - Add `onclick` class to element when `onClick` handler is applied
        - Preserve style of hover state while triggered popup is showing
        - Fixed styles to preserve a consistent size across variations
    - `header`
        - Changed variations to have `.view-header` class
        - Fixed CSS styles
    - `menu-item`
        - Added support for `href` and `external` values in `data`, which ignores when item is disabled or `onClick` is specified
        - Changed to use `<a>` as a view root element
        - Add `onclick` class to element when `onClick` handler is applied
        - Preserve style of hover state while triggered popup is showing
    - `select`
        - Added `beforeItems` and `afterItems` options to specify content before/after items
        - Added `limit` option to limit items count on first render
        - Added `minItemsFilter` option to specify minimal items count (excluding reset item) required to apply filter input (default `10`)
        - Changed popup content layout and styles
    - `signature`
        - Changed location path in details popup to use `[index]` instead of `pick(index)`
    - `source`
        - Added highlighting for `discovery-view` and `discovery-query`
    - `struct`
        - Improved estimated JSON size computation in action popup
        - Added "Copy path" to action popup
    - `table`
        - Added auto detection for column sorting state, i.e. determine an order of values in a column and mark column coresponding to the order if any
        - Make column non-sortable when all its values are equal, since sorting have no effect
        - Used natural sorting approach for generated sorting functions
        - Inverted icons for sorting direction
    - `tabs`
        - Changed `tabs` config option to take a query
        - Fixed `tab.content` overriding by `tabConfig.content` (`tab.content` wins as intended now)
        - Apply tabs configuration to tab's config instead of data
    - `tab`
        - Moved `value` and `text` from data to config
        - Added `disabled` config option
        - Add `onclick` class to element when `onClick` handler is applied

## 1.0.0-beta.38 (19-05-2020)

- Fixed switching to "Processing..." label on data is loaded and decoded instead of TTFB time

## 1.0.0-beta.37 (18-05-2020)

- Extended `prepare` handler to take extension API as a second parameter. For now API contains following methods:
    - `addValueAnnotation()` to define a value annotation used mostly in `struct` view. The first argument should be a handler: a function or a string query. Handler takes a value and context, which contains properties: `host` (an object or an array that includes a value), `key`, `index` and `parent` (a reference to parent context). The handler should return falsy value (when no annotation needed) or an object with following fields (all fields are optional):
        - `place` – `'after'` (by default) or `'before'`, where to place annotation before or after a value
        - `style` – `'default'` (by default), `'none'` (no any visual styles for annotation block) or `'badge'` (uses for object markers)
        - `className` - additional CSS classes that should be added to annotation block
        - `text` – annotation text
        - `title` – value for `title` attribute
        - `icon` - url, dataURI or class name with `icon-` prefix
        - `href` - annotation is a link
        - `external` - when annotation is a link, open in new window when true
    - `defineObjectMarker(name, options)` to define an object marker, which returns a function to wrap objects, i.e. `object.forEach(defineObjectMarker('foo', { /* options */ }))`. Options (all are optional):
        - `refs` – a list of string (a field name) or function (getter), which values should refer to an object beside direct reference to object. Uses for unique object values, e.g. `id`
        - `lookupRefs` - a list of string (a field name) or function (getter), that uses to retrieve additional values to identify original object
        - `page` - a string, marker should be a link to specified page
        - `ref` - a string (a field name) or a function (getter), a value that uses in link to page to identify object
        - `title` -  astring (a field name) or a function (getter), a text that represent an object, e.g. in `auto-link`
    - `addQueryHelpers()` method the same as `Widget#addQueryHelpers()`
- Added a set of default methods:
    - `marker(type?)` – returns any marker associated with a value, when `type` is specified only this type of marker may be returned
    - `markerAll()` – returns all markers associated with a value
- Removed `Widget#addEntityResolver()` method, use `defineObjectMarker()` instead
- Removed `Widget#addValueLinkResolver()` method, use `defineObjectMarker()` with `page` option instead
- Removed `Widget#addQueryHelpers()` method, use `addQueryHelpers()` instead
- Removed `resolveLink` option for `page.define()`, use `page` option in `defineObjectMarker()` instead

## 1.0.0-beta.36 (17-05-2020)

- Bumped deps: [jora@1.0.0-beta.2](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-beta.2)
- Fixed exception in `table` view when column query is empty

## 1.0.0-beta.35 (14-05-2020)

- Bumped deps: [hitext@1.0.0-beta.1](https://github.com/hitext/hitext/releases/tag/v1.0.0-beta.1), [hitext-prismjs@1.1.0](https://github.com/hitext/prismjs/releases/tag/v1.1.0)

## 1.0.0-beta.34 (14-05-2020)

- Bumped jora version to `1.0.0-beta.1`
- Improved error handling in query editor
- Fixed ignoring explicit column sorting in `table` view when value is falsy

## 1.0.0-beta.33 (07-05-2020)

- Fixed `table`'s cell content rendering when col config is a string
- Changed default sorting order to `desc` in `table` view
- Improved `table` auto-sorting detection

## 1.0.0-beta.32 (07-05-2020)

- Fixed `table` view to use `<table>` tag for root element instead of `<div>`
- Added `debounce` property to `input` view config
- Exposed lib API as `Widget#lib`
- Extended `safeFilterRx()` to add pattern value to produced regexp as `rawSource`
- Changed `value` option behaviour for `input` view to be a query instead of a plain value
- Fixed missed custom page's `decodeParams` method call on initial render
- Removed `defined()` helper
- Removed `Widget#getPageOption()` method
- Changed protocol for `page.options.decodeParams()`, handler must take an array of URI component pairs
- Extended protocol for `page.options.encodeParams()`, handler may return an array of URI component pairs or an object beside a string; keys and values will be encoded by host
- Changed references to default page as `defaultPageId` instead of hardcoded `'default'` value
- Added `Widget.options.reportPageId` option
- Improved `Widget.setPageHash()` method to detect changes based on decoded page id, ref and params and re-apply new values if needed
- Fixed `table` to not override `data` when column config in `cols` object have no `content` property
- Changed `table` to apply `when` on column config to entire column
- Changed `table` to not render a cell content depending on `whenData` in column config
- Changed `when` and `whenData` to not apply when `undefined` or not an own property (like not set at all)
- Added sorting for `table` view

## 1.0.0-beta.31 (23-04-2020)

- Added `checkbox-list` view
- Added `whenData` common option to view config
- Added `Popup#toggle()` method
- Added object/array size hint in `struct` view
- Added "sort keys" toggle for objects in `struct` view
- Added "sort keys" and "dict mode" actions for objects in `signature` view
- Extended `badge` and `pill-badge` views to use number and boolean data as text
- Extended `menu-item` to take data as item text when it's a string
- Extended `badge` to take data as item text when it's a string
- Extended `block` view to pass `onInit` and `onChange` handlers if any to its content
- Extended `checkbox`, `input`, `select` and `tabs` views to pass `data` and `context` to `onInit` and `onChange` handler beside value and name
- Changed `table` view to not render a row when data is falsy
- Changed `utils.createElement()` to ignore attributes with not own keys or `undefined` value
- Fixed edge cases for value stat output in `signature` view
- Fixed scrolling issue for `tabs` view when used in sidebar

## 1.0.0-beta.30 (25-03-2020)

- Added missed escaping for brackets in `safeFilterRx`
- Fixed style isolation for editors hints popup
- Improved overall CSS style isolation
- Added `dist/discovery.raw.css` to package, a file with no style isolation
- Improved error output on loading overlay

## 1.0.0-beta.29 (24-02-2020)

- Fixed `tree` view to apply nested `itemConfig` when `limitLines` is used
- Added `'children'` as default query for children in `tree` view

## 1.0.0-beta.28 (17-02-2020)

- Added encoding/decoding for `pageId` and `pageRef` in page hash
- Added an entity reference to resolved link info
- Fixed `tree-leaf` layout when content overflows
- Fixed showing label when `tree` view is empty
- Tweaked `tree` view padding in sidebar
- Bumped jora to [1.0.0-alpha.13](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-alpha.13)

## 1.0.0-beta.27 (18-12-2019)

- Fixed style isolation of signature popup
- Fixed editors extra large height in quirk mode

## 1.0.0-beta.26 (17-12-2019)

- Impoved `Widget#apply()` to recursevey call the method to each element when value is an array
- Extracted `chart` view (with Hightcharts as backend) to a separate [repo](https://github.com/discoveryjs/view-plugin-highcharts) and npm package, use [`@discoveryjs/view-plugin-highcharts`](https://github.com/discoveryjs/view-plugin-highcharts) instead
- Bumped jora to [1.0.0-alpha.11](https://github.com/discoveryjs/jora/releases/tag/v1.0.0-alpha.11)

## 1.0.0-beta.25 (13-12-2019)

- Fixed missed `dist` files in a package
- Added minification for JavaScript on build

## 1.0.0-beta.24 (13-12-2019)

- Fixed event handlers conflict across Discovery instances
- Fixed `popup` view styles when Discovery's container is not a document body
- Added wrapping for a string value that outputs as a plain text in `struct` view
- Changed `App#render()` and `Widget#render()` methods to return a render state promise
- Changed `PageRenderer#render()` method to return `{ pageEl, renderState }` object instead of just `newPageEl`
- Added optional parameter for `Widget` constructor to specify default page layout, i.e. `new Widget(container, defaultPage, options)`
- Added `extensions` and `compact` options to `Widget`/`App` constructor, i.e. `new Widget(el, null, { extensions, compact })`
- Renamed `dist` files: `lib.*` -> `discovery.*`
- Improved build by CSS styles basic isolation, to reduce impact on host environment when integrate into

## 1.0.0-beta.23 (12-12-2019)

- Fixed build due to lib imports processing bug

## 1.0.0-beta.22 (12-12-2019)

- Fixed SVG path data in pie charts in signature view (#25)
- Disabled `Prism` auto mode, which may break environment when Discovery is embeded (#24)
- Fixed global polution by `Prism` instance

## 1.0.0-beta.21 (15-09-2019)

- Fixed popup wrong position issues in some conditions (#16)
- Exposed layout helpers as `utils`: `getOffsetParent`, `getPageOffset`, `getBoundingRect` and `getViewportRect`
- Duplicated signature showing with click on button (better for mobile)
- Tweaked action buttons style in `struct` view to work better for touch devices
- Changed `struct` view to open a link in a new tab
- Added `limit` and `limitCollapsed` options support for `struct` view
- Fixed pie chart in `signature` view popups to work in all browsers (#17)
- Fixed `struct` view signature popup to show a path from a struct's data root

## 1.0.0-beta.20 (09-09-2019)

- Moved wrapping static outside (to `@discoveryjs/cli`)
- Removed unnecessary deps

## 1.0.0-beta.19 (08-09-2019)

- Fixed missed a dependency and a module for libs

## 1.0.0-beta.18 (08-09-2019)

- Removed `src/scan-fs.js` module since extracted into a separate package [@discoveryjs/scan-fs](https://github.com/discoveryjs/scan-fs)
- Extracted CLI tools to separate package [@discoveryjs/cli](https://github.com/discoveryjs/discovery-cli)

## 1.0.0-beta.17 (06-09-2019)

- Config
    - Extended `libs` option in model config to contain CSS files and made it available for model's `prepare` script
- Build
    - Added `--single-file` option to produce a model build as a single file
    - Fixed no favicon when favicon is not set up in a config (use default in this case)
    - Tweaked relative path output in build log
- Client
    - Fixed output of values that contain HTML in `signature` view

## 1.0.0-beta.16 (24-07-2019)

- Config
    - Added `--pretty-data` option to build to output `data.json` with indentation (better for deltas)
    - Allowed to set up path to config as a value for `discovery` field in `package.json`
    - Added `favicon` option to general and model configs
    - Added `viewport` option to general and model configs (to cusomize `<meta name="viewport">` value)
    - Added `libs` option to model view config
    - Added model name injection into page HTML (as title)
- Build
    - Fixed missed quotes for `data:` urls on CSS bundling
    - Fixed unnecessary `require()` resolving in model code
- Client
    - Changed `QueryEditor` constructor to take a function to get suggestions instead of `discovery` instance
    - Fixed issue when suggestion item in editor can't be choosen by a click
    - Fixed routing in model-free mode, when loading a data doesn't switch to report page

## 1.0.0-beta.15 (03-07-2019)

- Client
    - Added `fallback` option to `auto-link` view, which is using as a view config when a link is not resolved
    - Prevented influence of view build error block styles on other views on report page

## 1.0.0-beta.14 (26-06-2019)

- Client
    - Fixed trigger arrow position in `expand` view to be at the vertical middle
    - Tweaked `config-error` view styles
    - Changed render behaviour when a view config is not specified, `config-error` view is using in such cases now instead of `struct` view
    - Prevented influence on `h3` and `textarea` element styles on report page
    - Tweaked headers styles
    - Changed `header` view to look like `h4` view but still level 2 header (`h2` tag is used)
    - Added `h5` view
    - Added `beforeTabs` and `afterTabs` config options to `tabs` view
    - Fixed report header jumping on hover in edit mode on report page in some browsers
    - Added virtual view `render` to render a view with config as current data and data as previous data
    - Removed global style rules for `<a>` element (it localized to `link` view now) and tweaked link's underline style
    - Reorganized CSS imports to avoid style duplicates
    - Fixed indent of empty list text for `ul` and `ol` views

## 1.0.0-beta.13 (18-06-2019)

- Server
    - Fixed model assets generation when non-default config file is specified
- Client
    - Fixed expanded state for `tree` view leafs when `expanded` setting is a number
    - Improved display of long strings and strings that contains newlines in `struct` view
    - Fixed config composing in `context` view
    - Added `View#ensureValidConfig()` to return a config that can be used for rendering
    - Renamed `View#extendConfig()` to `View#composeConfig()` and changed behaviour to handle more use cases
    - Changed `View#normalizeConfig()` to able return a `null` (no config) and no validation on view option is present (use `View#ensureValidConfig()` for that)
    - Added a list item config extension:
        - via `itemConfig` option for `list` (`list-*`), `columns`, `menu`, `select`, `tree` and `tree-leaf` views
        - via `rowConfig` option for `table` view
        - via `tabConfig` option for `tabs` view
    - Extended `className` option in a view config to take a `function(data, context)` or `Array.<function(data, context)|string>` beside a string
    - Removed `fallback` view
    - Improved view config error output (view can be overrided by defining custom `config-error` view)
    - Improved `select` view:
        - Added selected value state in variants list
        - Added `resetItem` option to specify a reset item in variants
        - Fixed `placeholder` is not visible
        - Fixed size when no item selected and no placeholder
    - Added `href` option to `auto-link` view, a function to preprocess a href value

## 1.0.0-beta.12 (07-03-2019)

- Client
    - Added `ViewRenderer#normalizeConfig(config)` and `ViewRenderer#extendConfig(config, extension)` methods (available as `discovery.view.*`)
    - Removed right padding/margin for last items in `hstack` and `columns`
    - Changed styles for `button`, `input` and `select` to be consistent with each others
    - Added disabled state for `menu-item` view
    - Added a message and disable menu items when JSON can't be copied through `struct` actions popup
    - Improved experience when JSON can't be copied through `struct` view actions, items are disabled and annotated with a reason message now
    - Added size of compacted JSON in `struct` actions menu
    - Renamed css class name for content block of `tree-leaf` view (added `view-` prefix)
    - Changed `source` view to extend flexibility to setup highlight ranges

## 1.0.0-beta.11 (10-02-2019)

- Client
    - Removed `toc-item` view
    - Replaced `Widget#getSidebarContext()` and `Widget#getPageContext()` for `Widget#getRenderContext()`
    - Added `placeholder` option for `select` view
    - Fixed `button` view styles
    - Fixed `tabs` init value setting when `name` option is specified
    - Added `onInit` and `onChange` options for `tabs` view
    - Extended `expanded` option for `tree` view, which can be a function now
    - Added `onToggle` option for `tree` view

## 1.0.0-beta.10 (07-02-2019)

- Server/builder
    - Fixed config normalization in single model setup (#9)
- Client
    - Bumped `jora` to [1.0.0-alpha.8](https://github.com/lahmatiy/jora/releases/tag/v1.0.0-alpha.8)
    - Added a cache for `Widget#querySuggestion()`
    - Changed pinned popup to not close on `mouseleave`
    - Changed `Popup` API:
        - Method `show` takes a render function as second parameter (optional) instead of `options`
        - Added `options.render(popupEl, triggerEl, hide)` which is using when the second parameter to `show` method is `undefined`
        - Removed `options.hoverElementToOptions` (use `options.render` instead)
    - Fixed `checkbox` issue when `checked` is not set but `name` is set

## 1.0.0-beta.9 (05-02-2019)

- Client
    - Added `signature` view to inspect a signature of dataset with details on value axises
    - Added `select` view
    - Added button views: `button`, `button-primary`, `button-danger` and `button-warning`
    - Added `limit` and `emptyText` options for `menu` view
    - Improved `struct` view to show an object or an array signature when expanded and `[𝕊]` action button is hovered
    - Improved `tree` view:
        - Added `limitLines` option to limit lines count on root children render, limits to 25 lines by default; use `limitLines: false` to disable it
        - Changed `limit` option to limit children count (this option served as `limitLines` before)
        - Added `expanded` option to specify initial leaf expanded level
        - Added `collapsable` option to hide a toggle element when a leaf is expaned
        - Prevented large tree growing by keeping already visited data leafs collapsed
    - Improved `Popup` view:
        - Added hover trigger mode which enables with options to constructor:
        ```js
            new discovery.view.Popup({
                hoverTriggers: string,
                hoverElementToOptions: fn(triggerEl): object,
                hoverPin: false | "popup-hover" | "trigger-click"
            })
        ```
        - Added `className` constructor option to set class name on popup's root element
        - Added setting a `max-width` for its content
        - Added `data-v-to`, `data-h-to` and `data-pin-mode` attributes to indicate a state of popup
        - Removed `xAnchor` option for `show()` method
        - Fixed various show/hide issues when several popups involved
        - Fixed popup closing when a click performs on/inside a trigger element while the popup is visible, now it stays visible
        - Fixed z-index when several popups are shown
    - Added signature preset on report page
    - Added view editor input prettify button on report page

## 1.0.0-beta.8 (30-01-2019)

- Client
    - Added `Windet#defaultPageId` and `options.defaultPageId` to define a page id that should be used when no `pageId` is specified
    - Added `Widget#pageHash` that contains hashed `pageId`, `pageRef` and `pageParams`
    - Added `Widget#encodePageHash(pageId, pageRef, pageParams)` and `Widget#decodePageHash(pageHash)` methods
    - Changed set a value for `pageParams`:
        - A value passing through `decodePageHash(encodePageHash())` pipeline, so it should serializable
        - A value passing through `decodeParams()` or `encodeParams()` when such methods are defined by a page (see default `report` page as example)
    - Added `Widget#scheduleRender(subject)` and `Widget#cancelScheduledRender(subject)` methods to schedule/cancel scheduled render of a page or/and a sidebar
    - Changed `Widget#setData()` to schedule renders instead of immediate render
    - Removed `App#reportLink()` method
    - Removed `reportLink()` query helper (use `pageLink()` instead)
    - Added `Emitter` as a base class for `Widget`/`App`, `PageRenderer` and `ViewRenderer` classes
    - Removed `Widget#definePage()` method, use `Widget#page.define()` instead
    - Extracted query and view editors from `report` page to a separate module, as `Widget#view.QueryEditor` and `Widget#view.ViewEditor` classes
    - Added `content` option in `auto-link` view config
    - Changed `source` view:
        - Removed `refs` preprocessing logic, now it takes array of `{ type: "error" | "ignore" | "link", range: [number, number], href?: string }` objects
        - Disabled syntax highlighting when source size over 100k to avoid page freezing
    - Added a pilot implementation of view presets. Preset's API available via `Widget#preset` and very common with page and view renderers. Preset can be used in views as preset name with `preset/` prefix (i.e. `{ view: 'preset/name', ... }`)

## 1.0.0-beta.7 (23-01-2019)

- Client
    - Added context menu in `struct` view with `Copy as JSON` actions
    - Improved copying performance of a large content to the buffer
    - Added `tree` view
    - Fixed report content hide on query error

## 1.0.0-beta.6 (16-01-2019)

- Build
    - Tweaked build to use `model.html` for a model build result
- Client
    - Fixed dzen mode works for any page through location hash parameter
    - Added toggle edit mode button on report page. Report editing can be disabled by `noedit` parameter in location hash
    - Added share button on report page
    - Added `Widget#options.viewPresets` option to extend view preset list on report page
    - Changed `discovery.view.renderList()` to return a Promise
    - Added `discovery.view.listLimit()` method to normalize a limit value
    - Allowed to use `false` as a value for `limit` option for `columns`, `table` and list views, which disables list output limitation
    - Added popup view (as `discovery.view.Popup` class)
    - Added `menu` and `menu-item` views
    - Improved UX and performance of `struct` view
    - Uniform page and view renderers API
        - Added `isDefined()` and `get()` methods and `names` getter to page renderer
        - Added `get()` method to view renderer
        - Renamed `views` getter to `names` for view renderer
        - `get()` methods return freezed page or view object

## 1.0.0-beta.5 (25-12-2018)

- Client
    - Added `Widget#querySuggestions()` and `Widget#getQueryEngineInfo()` methods
    - Added `jora` query suggestions on report page
    - Added `Widget#resolveEntity()` and `Widget#resolveValueLinks()` methods
    - Improved `struct` view to annotate a value with a badge using `Widget#resolveValueLinks()` method
    - Improved `struct` view to detect a string as an url
    - Added `auto-link` view
    - Bumped `jora` to 1.0.0-alpha.7

## 1.0.0-beta.4 (10-12-2018)

- Server
    - Prevented multiple data collection on multiple requests
    - Changed data caching setup
        - No data caching by default now
        - Enable caching by `--cache` option, that can be used to setup a directory for cache files (current working directory is using if path is not set)
        - Added `cache` option to models config to setup a cache across all models
        - Added `cache` option to model config to setup a cache for a model
        - Added `cacheBgUpdate` option to model config to setup interval for cache update inbackground
        - Added `cacheTtl` option to model config to setup max age of cache before it will be discarded
- Client
    - Added sidebar container content clearing before a sidebar rendering
    - Changed `scrollTop` reset behaviour on page render, it now preserves by default and resets on page id or page ref changes
    - Added view presets on report page (a single `Table` at the moment)
    - Bumped `jora` to [1.0.0-alpha.6](https://github.com/lahmatiy/jora/releases/tag/v1.0.0-alpha.6)

## 1.0.0-beta.3 (29-11-2018)

- Server
    - Generate assets by a separate process/command, therefore no need to restart a server on assets config change
- Client
    - Fixed `query()` jora helper
    - Removed `pick()` jora helper
    - Added ability to disable an auto-columns via cols map
    - Changed `badge` view to take a data as a string
    - Made `link` view more adaptive to input data
    - Show 1 level expanded struct on `default` and `report` pages

## 1.0.0-beta.2 (26-11-2018)

- Fixed `discovery-build` dependency issue
- Bumped `jora` to `1.0.0-alpha.5` (see [changes](https://github.com/lahmatiy/jora/releases/tag/v1.0.0-alpha.5))

## 1.0.0-beta.1 (25-11-2018)

- First public release
