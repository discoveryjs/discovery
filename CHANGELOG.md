## next

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
