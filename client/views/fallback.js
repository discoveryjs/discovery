/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('fallback', function(el, config, data, context) {
        const { reason } = config;
        const headerEl = el.appendChild(document.createElement('div'));
        const contentEl = el.appendChild(document.createElement('div'));

        headerEl.className = 'header';
        headerEl.innerText = 'Fallback view' + (reason ? ' – ' + reason : '');

        contentEl.className = 'content';
        discovery.view.render(contentEl, 'struct', data, context);
    });
}
