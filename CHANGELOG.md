## next

- Changed `scrollTop` reset behaviour on page render, it now preserves by default and resets on page id or page ref changes

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

<-[]->

foo~[key:key]~bar
foo->[key:key]->bar
