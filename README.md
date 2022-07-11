<img align="right" width="128" height="128"
     alt="Discovery.js project logo"
     src="https://user-images.githubusercontent.com/270491/48985803-1563ae80-f11d-11e8-92c0-e07fbf0bcd94.png"/>

# Discovery

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/discovery.svg)](https://www.npmjs.com/package/@discoveryjs/discovery)
[![Twitter](https://badgen.net/badge/follow/@js_discovery?icon=twitter)](https://twitter.com/js_discovery)

Hackable JSON discovery tool

> Documentation in progress...

## Articles

- [Discovery.js tutorials: quick start](https://dev.to/rdvornov/discovery-js-tutorials-quick-start-m3k)
- [JsonDiscovery: Changing a way we’re viewing JSON in a browser](https://blog.usejournal.com/changing-a-way-were-viewing-json-in-a-browser-51eda9103fa2)

## Examples of usage

- [Statoscope](https://github.com/statoscope/statoscope) – a toolkit to analyze and validate webpack bundle
- [CPUpro](https://github.com/lahmatiy/cpupro) – rethinking of CPU profile analysis
- [CSS syntax reference](https://csstree.github.io/docs/syntax/) ([source](https://github.com/csstree/docs/tree/master/src/syntax))
- [CSSWG spec drafts index](https://csstree.github.io/csswg-drafts-index/) ([source](https://github.com/csstree/csswg-drafts-index))

## Related projects

- [Discovery CLI](https://github.com/discoveryjs/discovery-cli) – CLI tools to serve & build projects based on Discovery.js
- [JsonDiscovery](https://github.com/discoveryjs/browser-extension-json-discovery) – Chrome/Firefox browser extension built on Discovery which allows to discover a JSON document and make reports
- [Jora](https://github.com/discoveryjs/jora) – data query language
- [Jora CLI](https://github.com/discoveryjs/jora-cli) – a tool to process JSON data using Jora in command line interface

## Plugins

- [@discoveryjs/view-plugin-highcharts](https://github.com/discoveryjs/view-plugin-highcharts) – [Highcharts](https://github.com/highcharts/highcharts) plugin

## Install

```
> npm install @discoveryjs/discovery
```

## Base concepts

**Model** goes through `data->prepare->render` chain. Data can be modified with `prepare` function and rendered by various views and its combinations.

**View** is a function(el, config, data, context) where:

* `el` - DOM-element in which view will be rendered
* `config` - configuration of view
* `data` - data to render
* `context` - contains of model data, metaifo (createdAt, etc), router (optional), any user defined or view defined additional data

**Page** is a root view function(el, data, context). Similar to view it has all of its arguments except config.

### Page

To define a page you should call `discovery.page.define(pageId, render(el, data, context), options)` where:

* `pageId` - unique page identifier
* `render` - page render function described above
* `options` - object with options:
    * `reuseEl` - do not clear container before render page (skiped for first render or pageId change)
    * `init` - invokes on first page render or pageId change
    * `keepScrollOffset` - dont scroll to page top if `pageId` didn't changed since last page render
    * `encodeParams`
    * `decodeParams`

Other handy methods for working with page:

* `discovery.renderPage()`
* `discovery.setPage(pageId, pageRef, renderParam)`, `discovery.setPageParams(renderParams)` triggers `renderPage()`
* `discovery.getPageContext()` gets context of page

### Special pages

There are some built-in special pages:

* `default`
* `report`
* `not-found`

You can override this pages with `page.define()` method

### View

To define new view just call `discovery.view.define(viewId, render, options)` where:
* `viewId` - unique view identifier
* `render` - function(el, config, data, context) or view definition object
* `options` - object with following fields:
    * `tag` - a tag name for a view container element. When value is `false` or `null` then `DocumentFragment` is used as a container

You can render your view with `discovery.view.render(el, view, data, context)` where:

* `view` can be string `viewId`, `ViewDefinition` or `Array<ViewDefinition>` viewId will expand to `{ view: viewId }`.
> Also you can specify `view` as `viewId:query`, that will give you handy shortcut to `{ view: viewId, data: query }`
* `viewDefinition` object with view definition settings:
    * `view`: string `viewId`
    * `when`: query, will be coerced to Boolean (but empty arrays and objects will coerce to `false`)
    * `data`: query (will be described later)
    * Also there can be view specific additional fields

### Special views

Also special built-in `sidebar` view is available you can override this view with `view.define`

### Queries

As a query you can specify string which will be processed by [Jora](https://github.com/lahmatiy/jora) so your data will be a result of following flow:

```
jora(value) -> function(data, context) -> data
```

Or you can use `function(data, context)` as query as well. Also you can use any data as query right away.

## License

MIT
