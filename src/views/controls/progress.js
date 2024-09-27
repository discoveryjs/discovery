/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import usage from './progress.usage.js';

export default function(host) {
    host.view.define('progress', function(el, config, data, context) {
        const { content, progress, color } = config;

        el.append(createElement('div', {
            class: 'progress',
            style: `--progress: ${Math.max(0, Math.min(1, Number(progress)))};--color: ${color || 'unset'};`
        }));

        if (content) {
            const contentEl = createElement('div', 'content');

            el.prepend(contentEl);

            return host.view.render(contentEl, content, data, context);
        }
    }, { usage });
}
