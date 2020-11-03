/* eslint-env browser */

import Dict from './dict.js';

const STUB_OBJECT = Object.freeze({});
const { hasOwnProperty } = Object;
const rootViewEls = new WeakMap();
const viewEls = new WeakMap();      // FIXME: should be isolated by ViewRenderer instance
const fragmentEls = new WeakMap();  // FIXME: should be isolated by ViewRenderer instance
const configTransitions = new WeakMap();
const specialConfigProps = new Set([
    'view',
    'when',
    'data',
    'whenData',
    'postRender',
    'className'
]);

function regConfigTransition(res, from) {
    configTransitions.set(res, from);
    return res;
}

function collectViewTree(node, parent, ignoreNodes) {
    if (ignoreNodes.has(node)) {
        return;
    }

    if (fragmentEls.has(node)) {
        const info = fragmentEls.get(node);
        const child = parent.children.find(child => child.view === info);

        if (child) {
            parent = child;
        } else {
            parent.children.push(parent = {
                node: null,
                parent,
                view: info,
                children: []
            });
        }
    }

    if (viewEls.has(node)) {
        parent.children.push(parent = {
            node,
            parent,
            view: viewEls.get(node),
            children: []
        });
    } else if (rootViewEls.has(node)) {
        parent.children.push(parent = {
            node,
            parent,
            viewRoot: rootViewEls.get(node),
            children: []
        });
    }

    if (node.nodeType === 1) {
        for (let child = node.firstChild; child; child = child.nextSibling) {
            collectViewTree(child, parent, ignoreNodes);
        }
    }
}

function createDefaultConfigErrorView(view) {
    return  {
        name: 'config-error',
        render: function(el, config) {
            el.className = 'buildin-view-config-error';
            el.textContent = config.reason;

            if ('config' in config) {
                const configEl = el.appendChild(document.createElement('span'));
                let expanded = false;

                configEl.className = 'toggle-config';
                configEl.textContent = 'show config...';
                configEl.addEventListener('click', () => {
                    expanded = !expanded;

                    el.classList.toggle('expanded', expanded);
                    configEl.textContent = expanded ? 'hide config...' : 'show config...';

                    if (expanded) {
                        const buffer = document.createDocumentFragment();
                        view.render(buffer, { view: 'struct', expanded: 1 }, config.config)
                            .then(() => el.appendChild(buffer));
                    } else {
                        el.lastChild.remove();
                    }
                });
            }
        },
        options: STUB_OBJECT
    };
};

function condition(type, host, config, data, context) {
    if (!hasOwnProperty.call(config, type) || config[type] === undefined) {
        return true;
    }

    return host.queryBool(config[type] === true ? '' : config[type], data, context);
}

function renderDom(renderer, placeholder, config, props, data, context) {
    const { tag } = renderer.options;
    const el = tag === false || tag === null
        ? document.createDocumentFragment()
        : document.createElement(tag || 'div');
    let pipeline = Promise.resolve(renderer.render(el, props, data, context));

    if (typeof config.postRender === 'function') {
        pipeline = pipeline.then(() => config.postRender(el, config, data, context));
    }

    return pipeline
        .then(function() {
            if (el.classList) {
                if (renderer.name) {
                    el.classList.add(`view-${renderer.name}`);
                }

                if (config.className) {
                    let classNames = config.className;

                    if (typeof classNames === 'function') {
                        classNames = classNames(data, context);
                    }

                    if (typeof classNames === 'string') {
                        classNames = classNames.trim().split(/\s+/);
                    }

                    if (Array.isArray(classNames)) {
                        el.classList.add(
                            ...classNames
                                .map(item => typeof item === 'function' ? item(data, context) : item)
                                .filter(Boolean)
                        );
                    }
                }
            }

            const info = {
                config,
                props,
                data,
                context
            };

            if (el.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
                viewEls.set(el, info);
            } else {
                for (let child of el.childNodes) {
                    fragmentEls.set(child, info);
                }
            }

            placeholder.replaceWith(el);
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
                const {
                    config: configQuery = '',
                    context: contextQuery = ''
                } = config;

                renderer = {
                    render: (el, _, _data) => {
                        const _config = configQuery !== '' ? this.host.query(configQuery, data, context) : _data;
                        const _context = this.host.query(contextQuery, context, data);
                        // config only   -> _config=query(data) _data=data
                        // data only     -> _config=query(data) _data=query(data)
                        // config & data -> _config=query(data) _data=query(data)

                        return this.render(
                            el,
                            _config,
                            _data !== _config ? _data : data,
                            _context
                        );
                    },
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
        const getData = 'data' in config
            ? Promise.resolve().then(() => this.host.query(config.data, data, context))
            : Promise.resolve(data);

        // resolve data and render a view when ready
        return getData
            .then(data =>
                condition('whenData', this.host, config, data, context)
                    ? renderDom(
                        renderer,
                        placeholder,
                        config,
                        this.propsFromConfig(config, data, context),
                        data,
                        context
                    )
                    : placeholder.remove()
            )
            .catch(e => {
                renderDom(this.get('alert-danger'), placeholder, {
                    postRender(el) {
                        el.style.whiteSpace = 'pre-wrap';
                        el.style.fontFamily = 'monospace';
                        el.style.fontSize = '12px';
                    }
                }, {}, e);
                console.error(e);
            });
    }

    return Promise.resolve();
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
            const [, prefix, op, query] = config.match(/^(\S+?)([:{])((?:.|\s)+)$/) || [];

            if (prefix) {
                if (op === '{') {
                    try {
                        return regConfigTransition(
                            this.host.queryToConfig(prefix, op + query),
                            config
                        );
                    } catch (error) {
                        return regConfigTransition(
                            this.badConfig(config, error),
                            config
                        );
                    }
                }

                return regConfigTransition({
                    view: prefix,
                    data: query
                }, config);
            }

            return regConfigTransition({
                view: config
            }, config);
        } else if (typeof config === 'function') {
            return regConfigTransition({
                view: config
            }, config);
        }

        return config;
    }

    badConfig(config, error) {
        const errorMsg = (error && error.message) || 'Unknown error';

        console.error(errorMsg, { config, error });

        return {
            view: this.defaultConfigErrorRenderer.render,
            reason: errorMsg,
            config
        };
    }

    ensureValidConfig(config) {
        if (Array.isArray(config)) {
            return config.map(item => this.ensureValidConfig(item));
        }

        if (!config || !config.view) {
            return this.badConfig(config, new Error(!config ? 'Config is not a valid value' : 'Option `view` is missed'));
        }

        return config;
    }

    composeConfig(config, extension) {
        config = this.normalizeConfig(config);
        extension = this.normalizeConfig(extension);

        // mix
        if (config && extension) {
            return Array.isArray(config)
                ? config.map(item => regConfigTransition({ ...item, ...extension }, [item, extension]))
                : regConfigTransition({ ...config, ...extension }, [config, extension]);
        }

        return config || extension;
    }

    propsFromConfig(config, data, context) {
        const props = regConfigTransition({}, config);

        for (const key in config) {
            if (hasOwnProperty.call(config, key) && !specialConfigProps.has(key)) {
                const value = config[key];

                props[key] = typeof value === 'string' && value.startsWith('=')
                    ? this.host.query(value.slice(1), data, context)
                    : value;
            }
        }

        return props;
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
        moreButton.innerHTML = caption;
        moreButton.addEventListener('click', () => {
            container.remove();
            fn();
        });

        container.appendChild(moreButton);
    }

    setViewRoot(node, name, props) {
        rootViewEls.set(node, {
            name,
            ...props
        });
    }

    getViewTree(ignore) {
        const ignoreNodes = new Set(ignore || []);
        const result = [];

        for (const root of this.host.getDomRoots()) {
            collectViewTree(root, { parent: null, children: result }, ignoreNodes);
        }

        return result;
    }

    getViewStackTrace(el) {
        const { container: root } = this.host.dom;

        if (!root || el instanceof Node === false || !root.contains(el)) {
            return null;
        }

        const stack = [];
        let cursor = el;

        while (cursor !== root) {
            if (viewEls.has(cursor)) {
                stack.push(viewEls.get(cursor));
            }

            cursor = cursor.parentNode;
        }

        if (stack.length === 0) {
            return null;
        }

        return stack.reverse();
    }

    getViewConfigTransitionTree(value) {
        let deps = configTransitions.get(value) || [];

        if (!Array.isArray(deps)) {
            deps = [deps];
        }

        return {
            value,
            deps: deps.map(this.getViewConfigTransitionTree, this)
        };
    }
}
