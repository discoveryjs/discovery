/* eslint-env browser */

import Dict from './dict.js';

const STUB_OBJECT = Object.freeze({});
const viewEls = new WeakMap();  // FIXME: should be isolated by ViewRenderer instance

function createDefaultConfigErrorView(view) {
    return  {
        name: 'config-error',
        render: function(el, config) {
            el.className = 'buildin-view-config-error';
            el.textContent = config.reason;

            if ('config' in config) {
                const configEl = el.appendChild(document.createElement('span'));
                configEl.className = 'show-config';
                configEl.textContent = 'show config...';
                configEl.addEventListener('click', () => {
                    configEl.remove();

                    const buffer = document.createDocumentFragment();
                    view.render(buffer, { view: 'struct', expanded: 1 }, config.config)
                        .then(() => {
                            el.appendChild(buffer);
                            el.classList.add('expanded');
                        });
                });
            }
        },
        options: STUB_OBJECT
    };
};

function condition(type, host, config, data, context) {
    if (!Object.hasOwnProperty.call(config, type) || config[type] === undefined) {
        return true;
    }

    return host.queryBool(config[type] === true ? '' : config[type], data, context);
}

function renderDom(renderer, placeholder, config, data, context) {
    const { tag } = renderer.options;
    const el = tag === false || tag === null
        ? document.createDocumentFragment()
        : document.createElement(tag || 'div');

    return Promise
        .resolve(renderer.render(el, config, data, context))
        .then(function() {
            if (el.classList) {
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
                                .filter(Boolean)
                        );
                    }
                }
            }

            if (el.nodeType === 1) {
                viewEls.set(el, {
                    nodes: [el],
                    config,
                    data,
                    context
                });
            } else {
                const nodes = [...el.children];
                nodes.forEach(childEl => viewEls.set(childEl, {
                    nodes,
                    config,
                    data,
                    context
                }));
            }

            placeholder.parentNode.replaceChild(el, placeholder);
        });
}

function render(container, config, data, context) {
    if (Array.isArray(config)) {
        return Promise.all(config.map(config => render.call(this, container, config, data, context)));
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
                    render: (el, _, config, context) =>
                        this.render(el, config, data, context),
                    name: false,
                    options: { tag: false }
                };
            } else if (config.view.startsWith('preset/')) {
                const presetName = config.view.substr(7);

                if (this.host.preset.isDefined(presetName)) {
                    renderer = {
                        render: this.host.preset.get(presetName).render,
                        name: false,
                        options: { tag: false }
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
        config = { reason: errorMsg, config };
    }

    if (!container) {
        container = document.createDocumentFragment();
    }

    if ('when' in config === false || condition('when', this.host, config, data, context)) {
        // immediately append a view insert point (a placeholder)
        const placeholder = container.appendChild(document.createComment(''));

        // resolve data and render a view when ready
        return Promise
            .resolve(
                // change context data if necessary
                'data' in config
                    ? this.host.query(config.data, data, context)
                    : data
            )
            .then(data =>
                condition('whenData', this.host, config, data, context)
                    ? renderDom(renderer, placeholder, config, data, context)
                    : placeholder.remove()
            )
            .catch(e => {
                renderDom(this.get('alert-danger'), placeholder, {}, e);
                console.error(e);
            });
    } else {
        return Promise.resolve();
    }
}

export default class ViewRenderer extends Dict {
    constructor(host) {
        super();

        this.host = host;
        this.defaultConfigErrorRenderer = createDefaultConfigErrorView(this);
    }

    define(name, render, options) {
        super.define(name, Object.freeze({
            name,
            render: typeof render === 'function'
                ? render.bind(this)
                : (el, _, data, context) => this.render(el, render, data, context),
            options: Object.freeze({ ...options })
        }));
    }

    normalizeConfig(config) {
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

    ensureValidConfig(config) {
        if (Array.isArray(config)) {
            return config.map(item => this.ensureValidConfig(item));
        }

        if (!config || !config.view) {
            return {
                view: this.defaultConfigErrorRenderer.render,
                reason: !config ? 'Config is not a valid value' : 'Option `view` is missed',
                config
            };
        }

        return config;
    }

    composeConfig(config, extension) {
        config = this.normalizeConfig(config);
        extension = this.normalizeConfig(extension);

        // mix
        if (config && extension) {
            return Array.isArray(config)
                ? config.map(item => ({ ...item, ...extension }))
                : { ...config, ...extension };
        }

        return config || extension;
    }

    render(container, config, data, context) {
        return render.call(
            this,
            container,
            this.ensureValidConfig(this.normalizeConfig(config)),
            data,
            context
        );
    }

    listLimit(value, defaultValue) {
        if (value === false) {
            return false;
        }

        if (!value || isNaN(value)) {
            return defaultValue;
        }

        return Math.max(parseInt(value, 10), 0) || defaultValue;
    }

    renderList(container, itemConfig, data, context, offset = 0, limit = false, moreContainer) {
        if (limit === false) {
            limit = data.length;
        }

        const result = Promise.all(
            data
                .slice(offset, offset + limit)
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
            offset + limit,
            limit,
            (offset, limit) => this.renderList(container, itemConfig, data, context, offset, limit, moreContainer)
        );

        return result;
    }

    maybeMoreButtons(container, beforeEl, count, offset, limit, renderMore) {
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

    renderMoreButton(container, caption, fn) {
        const moreButton = document.createElement('button');

        moreButton.className = 'more-button';
        moreButton.addEventListener('click', () => {
            container.remove();
            fn();
        });
        moreButton.innerHTML = caption;

        container.appendChild(moreButton);
    }

    getViewStackTrace(el) {
        const { container } = this.host.dom;

        if (!container || el instanceof Node === false || !container.contains(el)) {
            return null;
        }

        const stack = [];
        let cursor = el;

        while (cursor !== container) {
            if (viewEls.has(cursor)) {
                stack.push(viewEls.get(cursor));
            }

            cursor = cursor.parentNode;
        }

        // const nodes = container.querySelectorAll('*');

        // for (const node of nodes) {
        //     if (x.has(node)) {
        //         node.style.outline = '1px solid red';
        //     }
        // }

        if (stack.length === 0) {
            return null;
        }

        return stack.reverse();

    }
}
