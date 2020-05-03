/* eslint-env browser */

import Dict from './dict.js';
import type Widget from '../widget/index.js';

const STUB_OBJECT = Object.freeze({});

export type { View as Renderer, ViewRenderer, viewDefineConfig, viewConfig };

type viewRenderFn = (el: HTMLElement | DocumentFragment, config: viewConfig, data?: any, context?: any) => Promise<any> | undefined;
type viewDefineConfig = viewRenderFn | viewConfig;
type viewConfig = ViewConfig | string | viewConfig[];
type queryFn = (data: any, context: any) => any;
type query = string | queryFn | any;
type classNameFn = (data: any, context: any) => string | false | null | undefined;

interface ViewOptions {
    tag?: string | false | null;
}
interface View {
    name: string;
    options: ViewOptions;
    render: viewRenderFn;
}
interface ViewConfig {
    view: string | viewRenderFn;
    when?: query;
    data?: query;
    whenData?: query;
    className?: string | classNameFn | (string | classNameFn)[];
    [key: string]: any;
}
interface ErrorData {
    config: any;
    reason: string;
}

function createDefaultConfigErrorView(view: ViewRenderer): View {
    return  {
        name: 'config-error',
        options: STUB_OBJECT,
        render: function(el: HTMLElement, _, data: ErrorData) {
            const { config, reason } = data;

            el.className = 'buildin-view-config-error';
            el.textContent = reason;

            if (config) {
                const configEl = el.appendChild(document.createElement('span'));
                configEl.className = 'show-config';
                configEl.textContent = 'show config...';
                configEl.addEventListener('click', () => {
                    configEl.remove();

                    const buffer = document.createDocumentFragment();
                    view.render(buffer, { view: 'struct', expanded: 1 }, config)
                        .then(() => {
                            el.appendChild(buffer);
                            el.classList.add('expanded');
                        });
                });
            }

            return null;
        }
    };
};

function condition(
    type: string,
    host,
    config: ViewConfig,
    data?: any,
    context?: any
) {
    if (type in config === false) {
        return true;
    }

    return host.queryBool(config[type] === true ? '' : config[type], data, context);
}

function renderDom(
    renderer: View,
    placeholder: Node,
    config: ViewConfig,
    data?: any,
    context?: any
): Promise<void> {
    const { tag = 'div' } = renderer.options;
    const el = tag === false || tag === null
        ? document.createDocumentFragment()
        : document.createElement(tag);

    return Promise
        .resolve(renderer.render(el, config, data, context))
        .then(function() {
            if (el instanceof HTMLElement) {
                if (renderer.name) {
                    el.classList.add(`view-${renderer.name}`);
                }

                if (config.className) {
                    let classNames = config.className;

                    if (typeof classNames === 'string') {
                        // fast path
                        el.classList.add(classNames);
                    } else {
                        if (!Array.isArray(classNames)) {
                            classNames = [classNames];
                        }

                        el.classList.add(
                            ...classNames
                                .map(item => typeof item === 'function' ? item(data, context) : item)
                                .filter(Boolean as any as <T>(x: T | false) => x is T)
                        );
                    }
                }
            }

            placeholder.parentNode.replaceChild(el, placeholder);
        });
}

function render(
    container: HTMLElement | DocumentFragment,
    config: ViewConfig | ViewConfig[],
    data: any,
    context: any
): Promise<void> {
    if (Array.isArray(config)) {
        return Promise
            .allSettled(config.map(config => render.call(this, container, config, data, context)))
            .then();
    }

    let renderer = null;

    switch (typeof config.view) {
        case 'function':
            renderer = {
                render: config.view,
                name: false,
                options: STUB_OBJECT
            };
            break;

        case 'string':
            if (config.view === 'render') {
                renderer = {
                    name: false,
                    options: { tag: false },
                    render: (el, _, config, context) =>
                        this.render(el, config, data, context)
                };
            } else if (config.view.startsWith('preset/')) {
                const presetName = config.view.substr(7);

                if (this.host.preset.has(presetName)) {
                    renderer = {
                        name: false,
                        options: { tag: false },
                        render: this.host.preset.get(presetName).render
                    };
                } else {
                    return this.host.preset.render(container, presetName, data, context);
                }
            } else {
                renderer = this.get(config.view);
            }
            break;
    }

    if (!renderer) {
        const errorMsg = typeof config.view === 'string'
            ? 'View `' + config.view + '` is not found'
            : 'Render is not a function';

        console.error(errorMsg, config);

        renderer = this.get('config-error') || this.defaultConfigErrorRenderer;
        config = {
            view: 'config-error',
            data: {
                reason: errorMsg,
                config
            }
        };
    }

    if (!container) {
        container = document.createDocumentFragment();
    }

    if (condition('when', this.host, config, data, context)) {
        // immediately append a view insert point (a placeholder)
        const placeholder = container.appendChild(document.createComment(''));
        const _config = config; // FIXME: TypeScript raises errors otherwise

        // resolve data and render a view when ready
        return Promise
            .resolve(
                // change context data if necessary
                'data' in config
                    ? this.host.query(config.data, data, context)
                    : data
            )
            .then(data =>
                condition('whenData', this.host, _config, data, context)
                    ? renderDom(renderer, placeholder, _config, data, context)
                    : placeholder.remove()
            )
            .catch(e => {
                renderDom(this.get('alert-danger'), placeholder, { view: '' }, e);
                console.error(e);
            });
    } else {
        return Promise.resolve();
    }
}

export default class ViewRenderer extends Dict<View> {
    host: Widget;
    defaultConfigErrorRenderer: View;

    constructor(host: Widget) {
        super();

        this.host = host;
        this.defaultConfigErrorRenderer = createDefaultConfigErrorView(this);
    }

    define(name: string, render: viewDefineConfig, options?: ViewOptions): void {
        super.set(name, Object.freeze({
            name,
            options: Object.freeze({ ...options }),
            render: typeof render === 'function'
                ? render.bind(this)
                : (el, _, data, context) => this.render(el, render, data, context)
        }));
    }

    normalizeConfig(config: viewConfig): ViewConfig | ViewConfig[] | null {
        if (!config) {
            return null;
        }

        if (Array.isArray(config)) {
            return config.reduce(
                (res, item) => res.concat(this.normalizeConfig(item) || []),
                []
            );
        }

        if (typeof config === 'string') {
            const [, prefix, query] = config.match(/^(\S+?):((?:.|\s)+)$/) || [];

            if (prefix) {
                config = {
                    view: prefix,
                    data: query
                };
            } else {
                config = {
                    view: config
                };
            }
        } else if (typeof config === 'function') {
            config = {
                view: config
            };
        }

        return config;
    }

    ensureValidConfig(config: any): viewConfig {
        if (Array.isArray(config)) {
            return config.map(this.ensureValidConfig, this);
        }

        if (!config || !config.view) {
            return {
                view: this.defaultConfigErrorRenderer.render,
                data: {
                    reason: !config ? 'Config is an invalid value' : 'Option `view` is missed',
                    config
                }
            };
        }

        return config;
    }

    composeConfig(config: any, extension: any): ViewConfig | ViewConfig[] {
        config = this.normalizeConfig(config);
        extension = this.normalizeConfig(extension);

        // mix
        if (config !== null && extension !== null) {
            return Array.isArray(config)
                ? config.map(item => ({ ...item, ...extension }))
                : { ...config, ...extension };
        }

        return config !== null ? config : extension;
    }

    render(
        container: HTMLElement | DocumentFragment,
        config: viewConfig,
        data?,
        context?
    ): Promise<void> {
        return render.call(
            this,
            container,
            this.ensureValidConfig(this.normalizeConfig(config)),
            data,
            context
        );
    }

    listLimit(
        value: number | false,
        defaultValue: number
    ): number | false {
        if (value === false) {
            return false;
        }

        if (!value || isNaN(value)) {
            return defaultValue;
        }

        return Math.max(Math.floor(value), 1) || defaultValue;
    }

    renderList(
        container: HTMLElement | DocumentFragment,
        itemConfig: ViewConfig | ViewConfig[],
        data: any[],
        context,
        offset = 0,
        limit: number | false = false,
        moreContainer?: HTMLElement
    ): Promise<void> {
        if (limit === false) {
            limit = data.length;
        }

        const result = Promise.allSettled(
            data
                .slice(offset, offset + Number(limit))
                .map((value, sliceIndex, slice) =>
                    this.render(container, itemConfig, value, {
                        ...context,
                        index: offset + sliceIndex,
                        array: data,
                        sliceIndex,
                        slice
                    })
                )
        );

        this.maybeMoreButtons(
            moreContainer || container,
            null,
            data.length,
            offset + Number(limit),
            limit,
            (offset, limit) => this.renderList(container, itemConfig, data, context, offset, limit, moreContainer)
        );

        return result.then();
    }

    maybeMoreButtons(
        container: HTMLElement | DocumentFragment,
        beforeEl: Node | null,
        count: number,
        offset: number,
        limit: number,
        renderMore: (offset: number, count: number) => void
    ): HTMLElement | null {
        const restCount = count - offset;
        const buttons = restCount <= 0 ? null : document.createElement('span');

        if (restCount > limit) {
            this.renderMoreButton(
                buttons,
                'Show ' + limit + ' more...',
                () => renderMore(offset, limit)
            );
        }

        if (restCount > 0) {
            this.renderMoreButton(
                buttons,
                'Show all the rest ' + restCount + ' items...',
                () => renderMore(offset, Infinity)
            );
        }

        if (buttons !== null) {
            buttons.className = 'more-buttons';
            container.insertBefore(buttons, beforeEl);
        }

        return buttons;
    }

    renderMoreButton(
        container: HTMLElement,
        caption: string,
        fn: () => void
    ): void {
        const moreButton = document.createElement('button');

        moreButton.className = 'more-button';
        moreButton.addEventListener('click', () => {
            container.remove();
            fn();
        });
        moreButton.textContent = caption;

        container.appendChild(moreButton);
    }
}
