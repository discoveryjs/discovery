/* eslint-env browser */
import usage from './context.usage.js';

const props = `
#.props | {
    modifiers is array ?: is truthy ? [$] : [],
    content,
    proxy.bool(),
    onInit,
    onChange
}`;

export default function(host) {
    host.view.define('context', function(el, props, data, context) {
        let localContext = context;
        let contentStartMarker = null;
        let contentEndMarker = null;
        let lastRender = null;
        let inited = false;
        let { modifiers = [], content = [] } = props;
        const { proxy, onInit, onChange } = props;

        if (!Array.isArray(modifiers)) {
            modifiers = [modifiers];
        }

        const renderModifiers = this.render(el, this.composeConfig(modifiers, {
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

        function renderContent() {
            // clear old content
            let cursor = contentEndMarker.previousSibling;
            while (cursor && cursor !== contentStartMarker) {
                cursor = cursor.previousSibling;
                cursor.nextSibling.remove();
            }

            // render new content
            const buffer = lastRender = document.createDocumentFragment();
            return host.view
                .render(buffer, content, data, localContext)
                .then(() => {
                    if (buffer === lastRender) {
                        host.view.adoptFragment(buffer, contentStartMarker);
                        contentStartMarker.after(buffer);
                    }
                });
        }

        function updateContext(value, name) {
            if (name && (!Object.hasOwn(localContext, name) || localContext[name] !== value)) {
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
    }, {
        tag: false,
        props,
        usage
    });
}
