/* eslint-env browser */
import usage from './expand.usage.js';

export default function(discovery) {
    discovery.view.define('expand', function(el, config, data, context) {
        function renderState() {
            if (contentEl) {
                contentEl.remove();
                contentEl = null;
            }

            if (expanded) {
                el.classList.add('expanded');
                contentEl = document.createElement('div');
                discovery.view.render(contentEl, content, data, context);
                el.appendChild(contentEl);
            } else {
                el.classList.remove('expanded');
            }
        }

        let { expanded, title, content, onToggle } = config;
        const headerEl = el.appendChild(document.createElement('div'));
        const titleEl = headerEl.appendChild(document.createElement('div'));
        const triggerEl = headerEl.appendChild(document.createElement('div'));
        let contentEl = null;

        expanded = discovery.queryBool(expanded, data, context);

        headerEl.className = 'header';
        triggerEl.className = 'trigger';
        headerEl.addEventListener('click', () => {
            expanded = !expanded;
            renderState();

            if (typeof onToggle === 'function') {
                onToggle(expanded);
            }
        });

        discovery.view.render(titleEl, title || { view: 'text', data: '"No title"' }, data, context);
        renderState();
    }, { usage });
}
