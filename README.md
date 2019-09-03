<img align="right" width="128" height="128"
     alt="Discovery logo"
     src="https://user-images.githubusercontent.com/270491/48985803-1563ae80-f11d-11e8-92c0-e07fbf0bcd94.png"/>

# Discovery

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/discovery.svg)](https://www.npmjs.com/package/@discoveryjs/discovery)
[![Twitter](https://img.shields.io/badge/Twitter-@js_discovery-blue.svg)](https://twitter.com/js_discovery)

Hackable JSON discovery tool

> Documentation in progress...

## Related projects

- [JsonDiscovery](https://github.com/discoveryjs/browser-extension-json-discovery) – Chrome extension built on Discovery which allows you to discover a JSON documents and make reports on the fly

## Examples

- [CSS syntax reference](https://csstree.github.io/docs/new-syntax/) ([source](https://github.com/csstree/docs/tree/master/src/syntax))

## Install

```
> npm install @discoveryjs/discovery
```

## How to launch server

Run the command in folder with `discovery` installed:

```
> npx discovery
```

By default server server starts on port `8123`. You can change it by `-p` (or `--port`) option:

```
> npx discovery -p 7777
```

See more options with `-h` (or `--help`) argument:

## How to build a model

Run the command in folder with `discovery` installed:

```
> npx discovery-build
```

The result will be placed to `build` folder by default. You can change it with `-o` (or `--output`) option:

```
> npx discovery-build --output some/path
```

See more options with `-h` (or `--help`) argument:


## Modes

Discovery can work in following modes:

* Model-free (when no any model specified)
* Single model
* Multiple models

### Model-free

In this mode you can upload any data by clicking "Load data" button, or drag'n'drop file right into the browser.

### Multiple models

In this mode discovery will start with model selection page. Every model will have own route namespace, and you can switch models and reports at any time.

### Single model

If you want only one model, you should start discovery with `--model %modelName%`. In this mode index page will represent your model default page.

## Define a model

To configure discovery you should specify one of config files:

* `.discoveryrc.js`
* `.discoveryrc.json`
* `.discoveryrc` (the same as `.discoveryrc.json`)

Or you can add a section in your `package.json` file with `discovery` as a key.

### Config structure

Config should provide JSON or exports an object with following properties:

* `name` - name of discovery instance (used in page title)
* `models` - object with model configurations, where for each entry the key used as a slug and the value as a config

Example:

```js
module.exports = {
    name: 'My cool dashboards',
    models: {
        one: <modelConfig>,
        two: <modelConfig>
    }
};
```

## Define a model

Model config may consists of the following fields (all fields are optional):

* `name` – name of model (used in title)
* `data` – function which returns `any|Promise<any>`. Result of this function must be JSON serializable
* `prepare` – path to a script with additional initialization logic (e.g. add cyclic links and relations, extensions for query engine etc)
* `view` – object with following fields:
    * `basedir` – directory to resolve relative path in `assets` and `libs`
    * `libs` – path to libs, where key is local name available in asset's scope and value is a path to library file or an array of files (`.js` or `.css`)
    * `assets` – path to `.js` and `.css` files
    > js files has own scope (as modules) with a reference `discovery` that points to discovery instance
* `extendRouter` – `function(router, modelConfig, options)`
* `cache`
* `cacheTtl`
* `cacheBgUpdate`

Example:

```js
const path = require('path');

module.exports = {
    name: 'Model config',
    data: () => ({ hello: 'world' }),
    prepare: path.join(__dirname, 'path/to/prepare.js'),
    view: {
        basedir: __dirname,
        assets: [
            'ui/page/default.js',
            'ui/view/model-custom-view.css',
            'ui/view/model-custom-view.js',
            'ui/sidebar.css',
            'ui/sidebar.js'
        ]
    }
};
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
