/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import usage from './progress.usage.js';

export default function(discovery) {
    discovery.view.define('progress', function(el, config, data, context) {
        const { content, progress, color } = config;
        const progressEl = el.appendChild(createElement('div', {
            class: 'progress',
            style: `--progress: ${Math.max(0, Math.min(1, Number(progress)))};--color: ${color || 'unset'};`
        }));

        if (content) {
            const contentEl = el.insertBefore(createElement('div', { class: 'content' }), progressEl);

            return discovery.view.render(contentEl, content, data, context);
        }
    }, { usage });
}
