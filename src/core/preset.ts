/* eslint-env browser */

import type { ViewRenderer } from './view.js';
import { Dictionary } from './dict.js';

export type Preset = {
    name: string;
    render(el: HTMLElement | DocumentFragment, config: any, data: any, context: any): any;
    config: any;
}

export class PresetRenderer extends Dictionary<Preset> {
    #view: ViewRenderer;

    constructor(view: ViewRenderer) {
        super();

        this.#view = view;
    }

    define(name: string, config: any) {
        // FIXME: add check that config is serializable object
        config = JSON.parse(JSON.stringify(config));

        return PresetRenderer.define<Preset>(this, name, Object.freeze({
            name,
            render: (el, _, data, context) => this.#view.render(el, config, data, context),
            config
        }));
    }

    render(
        container: HTMLElement | DocumentFragment,
        name: string,
        data?: any,
        context?: any
    ) {
        const preset = this.get(name);

        if (!preset) {
            const errorMsg = 'Preset `' + name + '` is not found';
            console.error(errorMsg, name);

            const el = container.appendChild(document.createElement('div'));
            el.className = 'discovery-buildin-view-config-error';
            el.textContent = errorMsg;

            return Promise.resolve();
        }

        return preset.render(container, null, data, context);
    }
}
