/* eslint-env browser */
import usage from './context.usage.js';

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
                        discovery.view.adoptFragment(buffer, contentStartMarker);
                        contentStartMarker.after(buffer);
                    }
                });
        }

        function updateContext(value, name) {
            if (name && (!hasOwnProperty.call(localContext, name) || localContext[name] !== value)) {
                localContext = {
                    ...localContext,
                    [name]: value
                };

                if (inited) {
                    renderContent();

                    if (proxy && typeof onChange === 'function') {
                        onChange(value, name);
                    }
                } else if (typeof onInit === 'function') {
                    onInit(value, name);
                }
            }
        }

        let localContext = context;
        let contentStartMarker = null;
        let contentEndMarker = null;
        let lastRender = null;
        let inited = false;
        let { modifiers = [], content = [] } = config;
        const { proxy, onInit, onChange } = config;

        if (!Array.isArray(modifiers)) {
            modifiers = [modifiers];
        }

        const renderModifiers = discovery.view.render(el, this.composeConfig(modifiers, {
            onInit: updateContext,
            onChange: updateContext
        }), data, context);

        contentStartMarker = el.appendChild(document.createComment('{ view: "context" } content start'));
        contentEndMarker = el.appendChild(document.createComment('{ view: "context" } content end'));

        if (proxy && (onInit || onChange)) {
            content = this.composeConfig(content, { onInit, onChange });
        }

        return renderModifiers.then(() => {
            inited = true;
            return renderContent();
        });
    }, {
        tag: false,
        usage
    });
}
