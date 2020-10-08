## next

- Exposed `lookupObjectMarker(value, type?)` and `lookupObjectMarkerAll(value)` methods to prepare handler
- Added `Widget#queryFn(query)` method
- Fixed symbol stringifing in `struct` view
- Isolated view defined props with querable values supported and pass it to view's render. That means special properties (`view`, `when`, `data`, `whenData`, `className` and `postRender`) aren't passing to a view's render now. A querable value is a string that starts with `=`, e.g. `{ view: 'list', limit: '= size() | $ > 13 ? 10 : $' }` will show entire list if its size <= 13, otherwise by 10 items at once.
- Fixed view name highlighting overlap a selection in view editor
- Fixed report scroll jumping on typing in an editor due to change in rendered content height
- Made header sticky on report page

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
