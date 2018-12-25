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
