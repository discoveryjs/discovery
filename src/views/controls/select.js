/* eslint-env browser */
import usage from './select.usage.js';

export default function(host) {
    const defaultItemRender = 'text-match:{ text, match: #.filter }';
    const variantQuery = '{ value: $, text: #.selectVariantTextQuery.query($, #) }';
    const variantsPopup = new host.view.Popup({
        className: 'view-select-popup'
    });

    host.view.define('select', function(el, config, data, context) {
        function renderCaption() {
            el.innerHTML = '';
            if (currentValue !== undefined) {
                return host.view.render(el, host.view.composeConfig({
                    view: 'menu-item',
                    data: variantQuery,
                    content: item
                }, itemConfig), currentValue, variantsPopupContext);
            }
        }

        const {
            name,
            value,
            text = '$',
            placeholder,
            limit,
            minItemsFilter = 10,
            resetItem = false,
            item = defaultItemRender,
            itemConfig,
            beforeItems,
            afterItems,
            onInit,
            onChange
        } = config;
        let currentValue = value ? host.query(value, data, context) : context[name];
        let variantsPopupContext = {
            ...context,
            selectMinItemsFilter: minItemsFilter,
            selectCurrentValue: currentValue,
            selectVariantTextQuery: text,
            selectResetItem: resetItem
                ? [{ value: undefined, text: '', ...resetItem, resetItem: true }]
                : []
        };
        const popupContent = [];

        if (beforeItems) {
            popupContent.push(host.view.composeConfig(beforeItems, { onInit, onChange }));
        }

        popupContent.push({
            view: 'context',
            data: `.(${variantQuery})`,
            modifiers: {
                view: 'input',
                when: 'size() >= #.selectMinItemsFilter',
                type: 'regexp',
                name: 'filter',
                className: 'view-select__filter',
                placeholder: 'Filter'
            },
            content: {
                view: 'menu',
                className: 'view-select__variants',
                data: '#.selectResetItem + .[no #.filter or text~=#.filter]',
                limit,
                itemConfig: host.view.composeConfig({
                    className: [
                        data => data.resetItem ? 'reset-item' : '',
                        data => data.value === currentValue ? 'selected' : ''
                    ]
                }, itemConfig),
                item,
                onClick(data) {
                    variantsPopup.hide();

                    if (currentValue !== data.value) {
                        currentValue = data.value;
                        variantsPopupContext = {
                            ...variantsPopupContext,
                            selectCurrentValue: currentValue
                        };
                        renderCaption();

                        if (typeof onChange === 'function') {
                            onChange(data.value, name, data, context);
                        }
                    }
                }
            }
        });

        if (afterItems) {
            popupContent.push(host.view.composeConfig(afterItems, { onInit, onChange }));
        }

        if (placeholder) {
            el.dataset.placeholder = placeholder;
        }

        el.tabIndex = 0;
        el.addEventListener('click', () => {
            variantsPopup.toggle(el, popupEl =>
                host.view.render(popupEl, popupContent, data, variantsPopupContext)
                    .then(() => (popupEl.querySelector('.view-select__filter input') || { focus() {} }).focus())
            );
        });

        if (typeof onInit === 'function') {
            onInit(currentValue, name, data, context);
        }

        return renderCaption();
    }, { usage });
}
