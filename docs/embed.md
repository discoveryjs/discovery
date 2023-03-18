# Embed API

The Embed API allows to connect and communicate (via `postMessage` API) with a Discovery.js app embedded into an `<iframe>`.

```html
<iframe id="discovery-iframe" src="http://any.origin/discovery-model.html"></iframe>
<script type="module">
    import { connectToEmbedApp } from "@discoveryjs/discovery/dist/discovery-embed.js";
    
    const disconnect = connectToEmbedApp(document.getElementById('discovery-iframe'), (app) => {
        // do something when app is connected and ready

        return () => {
            // do something on app destroy (unload)
        };
    });

    // stop any communication 
    disconnect()
</script>
```

The connectToEmbedApp() function facilitates connection to an app that is loaded within an iframe. It takes two arguments: the first argument is the iframe element which loads the app's HTML page, and the second argument is a callback function that is triggered when the app is ready. The callback function can also return another function that gets triggered when the app is disposing. The connectToEmbedApp() function can be invoked multiple times on each page change or reload within the iframe. If needed, the integration with the app can be prevented by calling a function that is returned by the connectToEmbedApp() function.

Additioanal callback can be passed to handle a pre-init phase of an app (e.g. a preloader takes place) or early set up app's settings.

```js
import { connectToEmbedApp } from "@discoveryjs/discovery/dist/discovery-embed.js";
    
const disconnect = connectToEmbedApp(iframe,
    (preinit) => {
        // do something when app's preloader is connected and ready

        return () => {
            // do something on preloader destroy
        };
    },
    (app) => {
        // do something when app is connected and ready

        return () => {
            // do something on app destroy (unload)
        };
    }
);
```

The app loaded into an iframe should enable `embed` feature to allow communication with a host.

```js
import { App, Widget, embed } from '@discoveryjs/discovery';

// App
const myapp = new App({ embed: true }); // or the same as for Widget

// Widget
const myapp = new Widget({
    extensions: [
        embed
    ]
});
```

## Embed preinit API

- Events:
    * loadingStateChanged({ stage, progress, error })
- Publishers (reactive values):
    * (none)
- Methods:
    * on(eventName, fn)
    * once(eventName, fn)
    * off(eventName, fn)
    * defineAction(name, fn)

## Embed App API

- Events:
    * pageHashChanged(hash, replace)
    * darkmodeChanged({ mode: string, value: string })
    * loadingStateChanged({ stage, progress, error })
    * data()
    * unloadData()
- Publishers (reactive values):
    * pageHash: string
    * pageId: string
    * pageRef: string
    * pageParams: Record
    * darkmode: { mode: string, value: string }
- Methods:
    * on(eventName, fn)
    * once(eventName, fn)
    * off(eventName, fn)
    * defineAction(name, fn)
    * setPageHash(hash, replace)
    * setPage(id, ref, params, replace)
    * setPageRef(ref, replace)
    * setPageParams(params, replace)
    * setDarkmode(value)
    * unloadData()
    * loadData(dataLoader)
    * nav {primary, secondary, menu}
        * insert(config, position, name)
        * prepend(config)
        * append(config)
        * before(name, config)
        * after(name, config)
        * replace(name, config)
        * remove(name)
