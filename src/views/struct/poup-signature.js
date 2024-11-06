export function createSignaturePopup(host, elementData, elementOptions, buildPathForElement) {
    return new host.view.Popup({
        className: 'view-struct-signature-popup',
        hoverPin: 'popup-hover',
        hoverTriggers: '.view-struct .show-signature',
        showDelay: 50,
        render(popupEl, triggerEl) {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);
            const options = elementOptions.get(el) || {};

            popupEl.classList.add('computing');
            setTimeout(() => {
                host.view.render(popupEl, {
                    view: 'signature',
                    expanded: 2,
                    path: buildPathForElement(el)
                }, data, options.context).then(() => popupEl.classList.remove('computing'));
            }, 16);
        }
    });
}
