/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import usage from './page-header.usage.js';

export default function(host) {
    host.view.define('page-header', function render(el, config, data, context) {
        const { prelude, content, onInit, onChange } = config;
        const preludeEl = el.appendChild(createElement('div', 'view-page-header__prelude'));
        const contentEl = el.appendChild(createElement('div', 'view-page-header__content'));
        const mixinHandlers = (config) =>
            typeof onInit !== 'function' && typeof onChange !== 'function'
                ? config // left as is since nothing to mix in
                : this.composeConfig(config, {
                    onInit,
                    onChange
                });

        return Promise.all([
            host.view.render(preludeEl, mixinHandlers(prelude || []), data, context),
            host.view.render(contentEl, mixinHandlers(content || 'text'), data, context)
        ]);
    }, { usage });
}
