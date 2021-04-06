/* eslint-env browser */
import { Slugger } from 'marked';
import { createElement } from '../core/utils/dom.js';
import usage from './headers.usage.js';

export default function(discovery) {
    const slugger = new Slugger;

    function render(el, config, data, context) {
        const { content, anchor = false } = config;

        el.classList.add('view-header');

        const render = discovery.view.render(el, content || 'text', data, context);

        if (anchor) {
            render.then(() => {
                const slug = slugger.slug(anchor === true ? el.textContent : String(anchor), { dryrun: true });
                const href = discovery.encodePageHash(
                    discovery.pageId,
                    discovery.pageRef,
                    { ...discovery.pageParams, '!anchor': slug }
                );

                el.prepend(createElement('a', {
                    class: 'view-header__anchor',
                    id: `!anchor:${slug}`,
                    href
                }));
            });
        }

        return render;
    }

    discovery.view.define('header', render, { tag: 'h4', usage });
    discovery.view.define('h1', render, { tag: 'h1', usage });
    discovery.view.define('h2', render, { tag: 'h2', usage });
    discovery.view.define('h3', render, { tag: 'h3', usage });
    discovery.view.define('h4', render, { tag: 'h4', usage });
    discovery.view.define('h5', render, { tag: 'h5', usage });
}
