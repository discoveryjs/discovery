export function createSignaturePopup(host, elementData, buildPathForElement) {
    return new host.view.Popup({
        hoverPin: 'popup-hover',
        hoverTriggers: '.view-struct .show-signature',
        render: function(popupEl, triggerEl) {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);

            host.view.render(popupEl, {
                view: 'signature',
                expanded: 2,
                path: buildPathForElement(el)
            }, data);
        }
    });
}
