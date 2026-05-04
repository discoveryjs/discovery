import { createElement, createFragment } from '../core/utils/dom.js';
import { ViewModel } from '../main/view-model.js';

type MessageEntry = {
    el: HTMLElement;
    removeTimer: ReturnType<typeof setTimeout> | null;
    renderRequest: symbol | null;
}

// export an integration with default settings
export default Object.assign(setup(), { setup });
export type ToastMessagesOptions = {
    container: HTMLElement;
    removeTimeout: number;
};

function setup(options?: Partial<ToastMessagesOptions>) {
    options = {
        removeTimeout: 2500,
        ...options
    };

    return function(host: ViewModel) {
        const containerEl = options.container || host.dom.container;
        const messagesContainerEl = createElement('div', 'discovery-toast-messages');
        const messageById = new Map<string | number | symbol, MessageEntry>();
        const types = ['primary', 'success', 'danger', 'warning'] as const;
        const removeMessage = (id: string | number | symbol) => {
            const message = messageById.get(id);

            if (message) {
                messageById.delete(id);
                message.el.classList.add('ready-to-remove');
                message.el.addEventListener('transitionend', () => {
                    message.el.remove();
                }, { once: true });
            }
        };

        containerEl.append(messagesContainerEl);
        host.action.define('toastMessage', async (config: any) => {
            const {
                id = Symbol(),
                type,
                data,
                content = 'text',
                remove = true // with default auto-remove after some time
            } = typeof config === 'string'
                ? { data: config }
                : config && typeof config === 'object' && (typeof config.view === 'string' || Array.isArray(config))
                    ? { content: config }
                    : config;

            const contentFragment = createFragment();
            const renderRequest = Symbol();
            const message = messageById.get(id) ?? {
                el: createElement('div', 'toast-message-wrapper'),
                removeTimer: null,
                renderRequest: null
            };

            if (!messageById.has(id)) {
                messageById.set(id, message);
                messagesContainerEl.append(message.el);
            }

            message.renderRequest = renderRequest;

            host.view.render(contentFragment, {
                view: types.includes(type) ? `alert-${type}` : 'alert',
                content
            }, data).then(() => {
                if (message.renderRequest === renderRequest) {
                    message.el.replaceChildren(contentFragment);
                    message.el.prepend(createElement('button', {
                        class: 'toast-message-close-button',
                        onclick: () => removeMessage(id)
                    }, '×'));
                }
            });

            if (remove || typeof remove === 'number') {
                if (remove === 0) {
                    removeMessage(id);
                } else if (!message.removeTimer) {
                    message.removeTimer = setTimeout(
                        () => removeMessage(id),
                        typeof remove === 'number' ? remove : options.removeTimeout
                    );
                }
            } else {
                clearTimeout(message.removeTimer || undefined);
                message.removeTimer = null;
            }

            return id;
        });
    };
}
