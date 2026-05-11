/* eslint-env browser */

import { isRawViewConfig, type RawViewConfig, type ViewRenderer } from './view.js';
import { Dictionary } from './dict.js';
import { ViewModel } from '../main/view-model.js';
import { createElement } from './utils/index.js';

export type DialogConfig = {
    titleText: string; // for simple cases when only text is needed, to avoid extra config
    title: RawViewConfig;
    content: RawViewConfig;
    toolbar: RawViewConfig;
    onSubmit: (submit: DialogSubmit) => void;
    onCancel: () => void;
    onClose: () => void;
};
export type Dialog = {
    name: string;
    config: Partial<DialogConfig>;
}
export type DialogSubmit = {
    data: any;
    context: any;
    returnValue: any;
    submitValue: any;
};

export class DialogRegistry extends Dictionary<Dialog> {
    #host: ViewModel;
    #view: ViewRenderer;

    constructor(host: ViewModel, view: ViewRenderer) {
        super();

        this.#host = host;
        this.#view = view;
    }

    define(name: string, config: Partial<DialogConfig> | RawViewConfig): Dialog {
        return DialogRegistry.define<Dialog>(this, name, Object.freeze({
            name,
            config: normalizeDialogConfig(config)
        }));
    }

    show(
        nameOrConfig: string | Partial<DialogConfig> | RawViewConfig,
        data?: any,
        context?: any,
        options?: any
    ) {
        const { name, config } = typeof nameOrConfig === 'string'
            ? { name: nameOrConfig, config: this.get(nameOrConfig)?.config }
            : { name: null, config: normalizeDialogConfig(nameOrConfig) };

        if (!config) {
            const errorMsg = typeof name === 'string'
                ? 'Dialog `' + name + '` is not found'
                : 'Invalid dialog configuration';

            this.#host.logger.error(errorMsg, name);

            if (this.#host.action.has('toastMessage')) {
                this.#host.action.call('toastMessage', {
                    type: 'danger',
                    data: errorMsg
                });
            }

            throw new ReferenceError(errorMsg);
        }

        const { el: dialogEl } = createDialogElement(config.titleText);
        let submit = false;
        let submitValue: any;
        let returnValue = null;
        const dialog = {
            options,
            submit(value: any = returnValue) {
                submit = true;
                submitValue = value;
                dialogEl.close();
            },
            close() {
                dialogEl.close();
            }
        };

        this.#host.dom.container.append(dialogEl);
        dialogEl.showModal();
        dialogEl.onclose = () => {
            dialogEl.remove();

            if (submit) {
                config.onSubmit?.({
                    data,
                    context,
                    returnValue,
                    submitValue
                });
            } else {
                config.onCancel?.();
            }

            config.onClose?.();
        };

        const render = (
            config: Partial<DialogConfig>,
            renderData: any,
            renderContext: any
        ) => this.#view.render(dialogEl, {
            view: 'context',
            name: 'dialogValue',
            modifiers: {
                view: 'block',
                className: 'discovery-dialog__content',
                content: config.content
            },
            content: {
                view: 'block',
                className: 'discovery-dialog__toolbar',
                content: config.toolbar
            },
            onInit(value: any) {
                returnValue = value;
            },
            onChange(value: any) {
                returnValue = value;
            }
        }, renderData, { ...renderContext, dialog });

        return Object.assign(render(config, data, context), { dialog });
    }
}

function normalizeDialogConfig(config: Partial<DialogConfig> | RawViewConfig): Partial<DialogConfig> {
    if (isRawViewConfig(config)) {
        return { content: config };
    }

    return config;
}

function createDialogElement(titleText = '') {
    const titleEl = createElement('div', 'discovery-dialog__title', [titleText]);
    const actionButtonsEl = createElement('div', 'discovery-dialog__action-buttons');
    const el = createElement('dialog', 'discovery-dialog', [
        titleEl,
        actionButtonsEl
    ]);

    actionButtonsEl.append(createElement('button', {
        class: 'discovery-dialog__action-button',
        'data-dialog-action': 'close',
        onclick: () => el.close()
    }, '✕'));

    return {
        el,
        titleEl,
        actionButtonsEl
    };
}
