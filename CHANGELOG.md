## next

- Server
    - Fixed model assets generation when non-default config file is specified
- Client
    - Fixed expanded state for `tree` view leafs when `expanded` setting is a number
    - Improved display of long strings and strings that contains newlines in `struct` view
    - Fixed config composing in `context` view
    - Renamed `View#extendConfig()` method to `View#composeConfig()`

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
