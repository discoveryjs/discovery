/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import usage from './page-header.usage.js';

export default function(discovery) {
    discovery.view.define('page-header', function render(el, config, data, context) {
        const { prelude, content } = config;
        const preludeEl = el.appendChild(createElement('div', 'view-page-header__prelude'));
        const contentEl = el.appendChild(createElement('div', 'view-page-header__content'));

        return Promise.all([
            discovery.view.render(preludeEl, prelude || [], data, context),
            discovery.view.render(contentEl, content || 'text', data, context)
        ]);
    }, { usage });
}
