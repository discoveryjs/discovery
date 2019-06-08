/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('tabs', function(el, config, data, context) {
        function renderContent(value) {
            const handler = inited ? onChange : onInit;

            if (currentValue === value) {
                return;
            }

            currentValue = value;
            inited = true;

            if (Array.isArray(tabs)) {
                tabsEl.innerHTML = '';
                tabs.forEach(tab =>
                    discovery.view.render(tabsEl, discovery.view.composeConfig({
                        view: 'tab',
                        active: tab.value === currentValue,
                        content: tab.content,
                        onClick: renderContent
                    }, tabConfig), tab, context)
                );
            }

            if (content) {
                contentEl.innerHTML = '';
                discovery.view.render(contentEl, content, data, { ...context, [name]: value });
            }

            if (typeof handler === 'function') {
                handler(currentValue, name);
            }
        }

        const tabsEl = el.appendChild(document.createElement('div'));
        const contentEl = el.appendChild(document.createElement('div'));
        const { content, tabConfig, onInit, onChange } = config;
        let { name, tabs } = config;
        let inited = false;
        let currentValue = NaN;
        let initValue =
            'value' in config
                ? config.value
                : name in context
                    ? context[name]
                    : undefined;

        tabsEl.className = 'view-tabs-buttons';
        contentEl.className = 'view-tabs-content';

        if (typeof name !== 'string') {
            name = 'filter';
        }

        if (Array.isArray(tabs)) {
            tabs = tabs.map(tab => {
                const type = typeof tab;

                if (type === 'string' || type === 'number' || type === 'boolean') {
                    tab = { value: tab };
                }

                if (initValue === undefined || tab.active) {
                    initValue = tab.value;
                }

                return tab;
            });
        } else {
            tabs = [];
        }

        renderContent(initValue);
    });
}
