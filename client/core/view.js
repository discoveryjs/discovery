/* eslint-env browser */

const views = new WeakMap();
const STUB_OBJECT = Object.freeze({});
const BUILDIN_FALLBACK = {
    name: 'fallback',
    render: (el, config) => {
        el.style.cssText = 'color:#a00;border:1px dashed #a00;font-size:12px;padding:4px';
        el.innerText = config.reason;
    },
    options: STUB_OBJECT
};

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
                    el.classList.add(config.className);
                }
            }

            placeholder.parentNode.replaceChild(el, placeholder);
        });
}

export default class ViewRenderer {
    constructor(host) {
        this.host = host;
        views.set(this, Object.create(null));
    }

    define(name, customRender, options) {
        views.get(this)[name] = Object.freeze({
            name,
            render: typeof customRender === 'function'
                ? customRender.bind(this)
                : (el, config, data, context) => this.render(el, customRender, data, context),
            options: Object.freeze(Object.assign({}, options))
        });
    }

    isDefined(name) {
        return name in views.get(this);
    }

    get(name) {
        return views.get(this)[name];
    }

    get names() {
        return Object.keys(views.get(this)).sort();
    }

    render(container, config, data, context) {
        if (!config) {
            config = 'struct';
        }

        if (Array.isArray(config)) {
            return Promise.all(config.map(config => this.render(container, config, data, context)));
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

        let renderer = typeof config.view === 'function'
            ? { render: config.view, name: false, options: STUB_OBJECT }
            : this.get(config.view);

        if (!renderer) {
            const errorMsg = typeof config.view === 'string'
                ? 'View `' + config.view + '` is not found'
                : 'Render is not a function';
            console.error(errorMsg, config);
            renderer = this.get('fallback') || BUILDIN_FALLBACK;
            config = { reason: errorMsg };
        }

        if ('when' in config === false || this.host.queryBool(config.when, data, context)) {
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
                .then(data => renderDom(renderer, placeholder, config, data, context))
                .catch(e => {
                    renderDom(this.get('alert-danger'), placeholder, {}, e);
                    console.log(e);
                });
        } else {
            return Promise.resolve();
        }
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
                    this.render(container, itemConfig, value, Object.assign({}, context, {
                        index: offset + sliceIndex,
                        array: data,
                        sliceIndex,
                        slice
                    }))
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
}
