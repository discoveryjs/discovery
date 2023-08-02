/* eslint-env browser */
import usage from './toggle-group.usage.js';

export default function(host) {
    host.view.define('toggle-group', function(el, config, data, context) {
        async function render(_, value) {
            const handler = inited ? onChange : onInit;

            if (currentValue === value) {
                return;
            }

            currentValue = value;
            inited = true;

            if (Array.isArray(toggles)) {
                el.innerHTML = '';

                if (beforeToggles) {
                    beforeTogglesEl.innerHTML = '';
                    await host.view.render(beforeTogglesEl, beforeToggles, data, { ...context, [name]: value });
                    el.appendChild(beforeTogglesEl);
                }

                if (afterToggles) {
                    afterTogglesEl.innerHTML = '';
                    await host.view.render(afterTogglesEl, afterToggles, data, { ...context, [name]: value });
                    el.appendChild(afterTogglesEl);
                }

                await Promise.all(toggles.map((toggle, idx) =>
                    host.view.render(el, host.view.composeConfig(toggle, {
                        checked: toggle.value === currentValue
                    }), data[idx], context)
                ));
            }

            if (typeof handler === 'function') {
                handler(currentValue, name, data, context);
            }
        }

        const { beforeToggles, afterToggles, onInit, onChange } = config;
        let { name, toggleConfig } = config;
        let toggles = [];
        let beforeTogglesEl = null;
        let afterTogglesEl = null;
        let inited = false;
        let currentValue = NaN;
        let initValue =
            'value' in config
                ? config.value
                : name in context
                    ? context[name]
                    : undefined;
        toggleConfig = host.view.composeConfig({
            view: 'toggle',
            onToggle: render
        }, toggleConfig);

        if (beforeToggles) {
            beforeTogglesEl = document.createElement('div');
            beforeTogglesEl.className = 'view-toggle-group-before';
        }

        if (afterToggles) {
            afterTogglesEl = document.createElement('div');
            afterTogglesEl.className = 'view-toggle-group-after';
        }

        if (typeof name !== 'string') {
            name = 'filter';
        }

        if (Array.isArray(data)) {
            toggles = data.map(toggle => {
                const type = typeof toggle;

                if (type === 'string' || type === 'number' || type === 'boolean') {
                    toggle = { value: toggle };
                }

                if (initValue === undefined || toggle.active) {
                    initValue = toggle.value;
                }

                return host.view.composeConfig(
                    toggleConfig,
                    toggle
                );
            });
        }

        return render(true, initValue);
    }, { usage });
}
