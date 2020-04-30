/* eslint-env browser */

import Dict from './dict.js';
import type { ViewRenderer } from './view.js'

export default class PresetRenderer extends Dict {
    view: ViewRenderer;

    constructor(view) {
        super();

        this.view = view;
    }

    define(name, config) {
        // FIXME: add check that config is serializable object
        config = JSON.parse(JSON.stringify(config));

        super.define(name, Object.freeze({
            name,
            render: (el, _, data, context) => this.view.render(el, config, data, context),
            config
        }));
    }

    render(container, name, data, context) {
        let preset = this.get(name);

        if (!preset) {
            const errorMsg = 'Preset `' + name + '` is not found';
            console.error(errorMsg, name);

            const el = container.appendChild(document.createElement('div'));
            el.style.cssText = 'color:#a00;border:1px dashed #a00;font-size:12px;padding:4px';
            el.innerText = errorMsg;

            return Promise.resolve();
        }

        return preset.render(container, null, data, context);
    }
}
