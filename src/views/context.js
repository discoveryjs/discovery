/* eslint-env browser */
import { hasOwn } from '../core/utils/object-utils.js';
import usage from './context.usage.js';

const props = `#.props | {
    modifiers is array ?: is truthy ? [$] : [],
    name is string?,
    content,
    proxy.bool(),
    onInit is function?,
    onChange is function?
}`;

export default function(host) {
    host.view.define('context', async function(el, props, data, context) {
        let {
            modifiers = [],
            name: contextName,
            content = [],
            proxy,
            onInit,
            onChange
        } = props;

        let storage = contextName ? { ...context[contextName] } : {};
        let localContext = context;
        let lastRender = null;
        let inited = false;

        await this.render(el, this.composeConfig(modifiers, {
            onInit: updateContext,
            onChange: updateContext
        }), data, context);

        const contentStartMarker = el.appendChild(document.createComment('{ view: "context" } content start'));
        const contentEndMarker = el.appendChild(document.createComment('{ view: "context" } content end'));

        if (proxy) {
            if (onInit || onChange) {
                content = this.composeConfig(content, { onInit, onChange });
            }
        } else if (onInit) {
            onInit(storage, contextName);
        }

        inited = true;
        await renderContent();

        async function renderContent() {
            // clear old content
            let cursor = contentEndMarker.previousSibling;
            while (cursor && cursor !== contentStartMarker) {
                cursor = cursor.previousSibling;
                cursor.nextSibling.remove();
            }

            // render new content
            const buffer = lastRender = document.createDocumentFragment();

            await host.view.render(buffer, content, data, localContext);

            if (buffer === lastRender) {
                host.view.adoptFragment(buffer, contentStartMarker);
                contentStartMarker.after(buffer);
                lastRender = null;
            }
        }

        function updateContext(value, name) {
            if (name && (!hasOwn(storage, name) || storage[name] !== value)) {
                storage = { ...storage, [name]: value };
                localContext = contextName
                    ? { ...localContext, [contextName]: storage }
                    : { ...localContext, ...storage };

                if (inited) {
                    renderContent();

                    if (onChange) {
                        onChange(...proxy ? [value, name] : [storage, contextName]);
                    }
                } else if (proxy && onInit) {
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
