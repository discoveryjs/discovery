/* eslint-env browser */
import usage from './tabs.usage.js';

export default function(discovery) {
    discovery.view.define('tabs', function(el, config, data, context) {
        async function renderContent(value) {
            const handler = inited ? onChange : onInit;

            if (currentValue === value) {
                return;
            }

            const renderContext = beforeTabs || afterTabs || content
                ? { ...context, [name]: value }
                : null;

            currentValue = value;
            inited = true;

            if (Array.isArray(tabs)) {
                tabsEl.innerHTML = '';

                if (beforeTabs) {
                    beforeTabsEl.innerHTML = '';
                    await discovery.view.render(beforeTabsEl, beforeTabs, data, renderContext);
                    tabsEl.appendChild(beforeTabsEl);
                }

                await Promise.all(tabs.map(tab =>
                    discovery.view.render(tabsEl, discovery.view.composeConfig(tab, {
                        active: tab.value === currentValue
                    }), data, context)
                ));

                if (afterTabs) {
                    afterTabsEl.innerHTML = '';
                    await discovery.view.render(afterTabsEl, afterTabs, data, renderContext);
                    tabsEl.appendChild(afterTabsEl);
                }
            }

            if (content) {
                contentEl.innerHTML = '';
                await discovery.view.render(contentEl, content, data, renderContext);
            }

            if (typeof handler === 'function') {
                handler(currentValue, name, data, context);
            }
        }

        const { content, beforeTabs, afterTabs, onInit, onChange } = config;
        let { name, tabs, tabConfig } = config;
        const tabsEl = el.appendChild(document.createElement('div'));
        let contentEl = null;
        let beforeTabsEl = null;
        let afterTabsEl = null;
        let inited = false;
        let currentValue = NaN;
        let initValue =
            'value' in config
                ? config.value
                : name in context
                    ? context[name]
                    : undefined;

        tabs = discovery.query(tabs, data, context);
        tabConfig = discovery.view.composeConfig({
            view: 'tab',
            onClick: renderContent
        }, tabConfig);

        tabsEl.className = 'view-tabs-buttons';

        if (beforeTabs) {
            beforeTabsEl = document.createElement('div');
            beforeTabsEl.className = 'view-tabs-buttons-before';
        }

        if (afterTabs) {
            afterTabsEl = document.createElement('div');
            afterTabsEl.className = 'view-tabs-buttons-after';
        }

        if (content) {
            contentEl = el.appendChild(document.createElement('div'));
            contentEl.className = 'view-tabs-content';
        }

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

                return discovery.view.composeConfig(
                    tabConfig,
                    tab
                );
            });
        } else {
            tabs = [];
        }

        return renderContent(initValue);
    }, { usage });
}
