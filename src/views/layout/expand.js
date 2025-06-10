/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import usage from './expand.usage.js';

const props = `is not array? | {
    header: undefined,
    content: undefined,
    expanded: false,
    onToggle: undefined
} | overrideProps() | {
    ...,
    expanded.bool()
}`;

export default function(host) {
    host.view.define('expand', function(el, config, data, context) {
        async function renderState() {
            el.classList.toggle('expanded', expanded);

            if (expanded) {
                contentEl = createElement('div', 'content');

                await host.view.render(contentEl, content, data, context)
                    .then(() => el.appendChild(contentEl));
            } else if (contentEl !== null) {
                contentEl.remove();
                contentEl = null;
            }
        }

        let { expanded, header, content, onToggle } = config;
        const headerEl = el.appendChild(createElement('div', 'header'));
        const headerContentEl = headerEl.appendChild(createElement('div', 'header-content'));
        let contentEl = null;

        headerEl.appendChild(createElement('div', 'trigger'));
        headerEl.addEventListener('click', () => {
            expanded = !expanded;

            const finish = renderState();

            if (typeof onToggle === 'function') {
                onToggle(expanded, {
                    el,
                    finish,
                    data,
                    context
                });
            }
        });

        return Promise.all([
            host.view.render(headerContentEl, header || 'text:"\u00A0"', data, context),
            renderState()
        ]);
    }, { usage, props });
}
