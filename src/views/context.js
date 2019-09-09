/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('context', function(el, config, data, context) {
        function renderContent() {
            const container = contentStartMarker.parentNode;
            let cursor = contentEndMarker.previousSibling;

            // clear old content
            // TODO: replace for Range
            while (cursor && cursor !== contentStartMarker) {
                cursor = cursor.previousSibling;
                container.removeChild(cursor.nextSibling);
            }

            // render new content
            const buffer = document.createDocumentFragment();
            discovery.view
                .render(buffer, content, data, localContext)
                .then(() => contentEndMarker.parentNode.insertBefore(buffer, contentEndMarker));
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
        let inited = false;
        let { modifiers = [] } = config;
        const { content } = config;

        if (!Array.isArray(modifiers)) {
            modifiers = [modifiers];
        }

        const awaitRender = discovery.view.render(el, modifiers.map(
            item => this.composeConfig(item, {
                onInit: updateContext,
                onChange: updateContext
            })
        ), data, context);

        contentStartMarker = el.appendChild(document.createComment('context view content start'));
        contentEndMarker = el.appendChild(document.createComment('context view content end'));
        awaitRender.then(() => {
            inited = true;
            renderContent();
        });
    }, {
        tag: false
    });
}
