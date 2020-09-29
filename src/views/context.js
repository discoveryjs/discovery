/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('context', function(el, config, data, context) {
        function renderContent() {
            // clear old content
            let cursor = contentEndMarker.previousSibling;
            while (cursor && cursor !== contentStartMarker) {
                cursor = cursor.previousSibling;
                cursor.nextSibling.remove();
            }

            // render new content
            const buffer = lastRender = document.createDocumentFragment();
            return discovery.view
                .render(buffer, content, data, localContext)
                .then(() => {
                    if (buffer === lastRender) {
                        contentStartMarker.after(buffer);
                    }
                });
        }

        function updateContext(value, name) {
            if (name) {
                localContext[name] = value;

                if (inited) {
                    renderContent();
                }
            }
        }

        let localContext = { ...context };
        let contentStartMarker = null;
        let contentEndMarker = null;
        let lastRender = null;
        let inited = false;
        let { modifiers = [] } = config;
        const { content = [] } = config;

        if (!Array.isArray(modifiers)) {
            modifiers = [modifiers];
        }

        const awaitRender = discovery.view.render(el, this.composeConfig(modifiers, {
            onInit: updateContext,
            onChange: updateContext
        }), data, context);

        contentStartMarker = el.appendChild(document.createComment('{ view: "context" } content start'));
        contentEndMarker = el.appendChild(document.createComment('{ view: "context" } content end'));

        return awaitRender.then(() => {
            inited = true;
            renderContent();
        });
    }, {
        tag: false
    });
}
