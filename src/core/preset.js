/* eslint-env browser */

import Dict from './dict.js';

export default class PresetRenderer extends Dict {
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
            el.className = 'buildin-view-config-error';
            el.innerText = errorMsg;

            return Promise.resolve();
        }

        return preset.render(container, null, data, context);
    }
}
