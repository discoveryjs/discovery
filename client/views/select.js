/* eslint-env browser */

export default function(discovery) {
    const defaultItemRender = 'text-match:{ text, match: #.filter }';
    const variantsPopup = new discovery.view.Popup({
        className: 'select-variants'
    });

    discovery.view.define('select', function(el, config, data, context) {
        function renderCaption() {
            el.innerHTML = '';
            discovery.view.render(el, {
                view: 'menu-item',
                data: '{ value: $, text: ' + text + ' or "" }',
                content: item
            }, currentValue, context);
        }

        const { name, value, text, item = defaultItemRender, onInit, onChange } = config;
        let currentValue = value ? discovery.query(value, data, context) : context[name];

        el.addEventListener('click', () => {
            if (variantsPopup.visible) {
                variantsPopup.hide();
                return;
            }

            variantsPopup.show(el, {
                render(popupEl) {
                    discovery.view.render(popupEl, {
                        view: 'content-filter',
                        data: '.({ value: $, text: ' + text + ' })',
                        content: {
                            view: 'menu',
                            data: '.[no #.filter or text~=#.filter]',
                            item,
                            onClick: (data) => {
                                variantsPopup.hide();

                                if (currentValue !== data.value) {
                                    currentValue = data.value;
                                    renderCaption();

                                    if (typeof onChange === 'function') {
                                        onChange(data.value, name);
                                    }
                                }
                            }
                        }
                    }, data, context).then(() =>
                        popupEl.querySelector('input').focus()
                    );
                }
            });
        });

        if (typeof onInit === 'function') {
            onInit(currentValue, name);
        }

        renderCaption();
    });
}
