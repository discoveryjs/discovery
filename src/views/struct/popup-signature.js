function findRootData(context) {
    while (context.parent !== null) {
        context = context.parent;
    }

    return context.host[''];
}

export function createSignaturePopup(host, elementData, elementContext, elementOptions, buildPathForElement) {
    return new host.view.Popup({
        className: 'view-struct-signature-popup',
        hoverPin: 'popup-hover',
        hoverTriggers: '.view-struct .show-signature',
        showDelay: 50,
        render(popupEl, triggerEl) {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);
            const context = elementContext.get(el);
            const options = elementOptions.get(el) || {};

            popupEl.classList.add('computing');
            setTimeout(() => {
                host.view.render(popupEl, {
                    view: 'signature',
                    expanded: 2,
                    rootData: findRootData(context),
                    path: buildPathForElement(el)
                }, data, options.context).then(() => popupEl.classList.remove('computing'));
            }, 16);
        }
    });
}
