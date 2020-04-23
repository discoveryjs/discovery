/* eslint-env browser */

export default function(discovery) {
    const defaultItemRender = 'text-match:{ text, match: #.filter }';
    const variantQuery = '{ value: $, text: #.selectVariantTextQuery.query($, #) }';
    const variantsQuery = `.(${variantQuery})`;
    const variantsPopup = new discovery.view.Popup({
        className: 'select-variants'
    });

    discovery.view.define('select', function(el, config, data, context) {
        function renderCaption() {
            el.innerHTML = '';
            if (currentValue !== undefined) {
                discovery.view.render(el, discovery.view.composeConfig({
                    view: 'menu-item',
                    data: variantQuery,
                    content: item
                }, itemConfig), currentValue, variantsPopupContext);
            }
        }

        const { name, value, text = '$', placeholder, resetItem = false, item = defaultItemRender, itemConfig, onInit, onChange } = config;
        let currentValue = value ? discovery.query(value, data, context) : context[name];
        let variantsPopupContext = {
            ...context,
            selectCurrentValue: currentValue,
            selectVariantTextQuery: text,
            selectResetItem: resetItem === true
                ? { value: undefined, text: '' }
                : resetItem
        };

        if (placeholder) {
            el.dataset.placeholder = placeholder;
        }

        el.tabIndex = 0;
        el.addEventListener('click', () => {
            if (variantsPopup.visible) {
                variantsPopup.hide();
                return;
            }

            variantsPopup.show(el, popupEl => {
                discovery.view.render(popupEl, {
                    view: 'content-filter',
                    data: resetItem
                        ? `[{
                            value: undefined,
                            text: "",
                            resetItem: true,
                            ...#.selectResetItem
                        }] + ${variantsQuery}`
                        : variantsQuery,
                    content: {
                        view: 'menu',
                        data: '.[no #.filter or text~=#.filter or resetItem]',
                        itemConfig: discovery.view.composeConfig({
                            className: [
                                data => data.resetItem ? 'reset-item' : '',
                                data => data.value === currentValue ? 'selected' : ''
                            ]
                        }, itemConfig),
                        item,
                        onClick: (data) => {
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
                }, data, variantsPopupContext).then(() =>
                    popupEl.querySelector('input').focus()
                );
            });
        });

        if (typeof onInit === 'function') {
            onInit(currentValue, name, data, context);
        }

        renderCaption();
    });
}
