/* eslint-env browser */
import { slug as generateSlug } from 'github-slugger';
import { createElement } from '../../core/utils/dom.js';
import usage from './headers.usage.js';

export default function(host) {
    async function render(el, config, data, context) {
        const { content, anchor = false } = config;

        el.classList.add('view-header');

        await host.view.render(el, content || 'text', data, context);

        if (anchor) {
            const slug = generateSlug(anchor === true ? el.textContent : String(anchor));
            const href = host.encodePageHash(
                host.pageId,
                host.pageRef,
                { ...host.pageParams, '!anchor': slug }
            );

            el.prepend(createElement('a', {
                class: 'view-header__anchor',
                id: `!anchor:${slug}`,
                href
            }));
        }
    }

    host.view.define('header', render, { tag: 'h4', usage });
    host.view.define('h1', render, { tag: 'h1', usage });
    host.view.define('h2', render, { tag: 'h2', usage });
    host.view.define('h3', render, { tag: 'h3', usage });
    host.view.define('h4', render, { tag: 'h4', usage });
    host.view.define('h5', render, { tag: 'h5', usage });
}
