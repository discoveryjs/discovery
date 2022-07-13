/* eslint-env browser */

import Dict from './dict.js';

const STUB_OBJECT = Object.freeze({});
const { hasOwnProperty } = Object;
const rootViewEls = new WeakMap();
const viewEls = new WeakMap();      // FIXME: should be isolated by ViewRenderer instance
const fragmentEls = new WeakMap();  // FIXME: should be isolated by ViewRenderer instance
const configTransitions = new WeakMap();
const configOnlyProps = new Set([
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
        for (const info of fragmentEls.get(node)) {
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

function createDefaultRenderErrorView(view) {
    return {
        name: false,
        options: STUB_OBJECT,
        render(el, config) {
            el.className = 'discovery-buildin-view-render-error';
            el.dataset.type = config.type;
            el.textContent = config.reason;

            if ('config' in config) {
                const configEl = el.appendChild(document.createElement('span'));

                configEl.className = 'toggle-config';
                configEl.textContent = 'show config...';
                configEl.addEventListener('click', () => {
                    if (el.classList.toggle('expanded')) {
                        configEl.textContent = 'hide config...';
                        view.render(el, { view: 'struct', expanded: 1 }, config.config);
                    } else {
                        configEl.textContent = 'show config...';
                        el.lastChild.remove();
                    }
                });
            }
        }
    };
}

function condition(type, host, config, data, context, inputData, placeholder) {
    if (!hasOwnProperty.call(config, type) || config[type] === undefined) {
        return true;
    }

    if (host.queryBool(config[type] === true ? '' : config[type], data, context)) {
        return true;
    }

    viewEls.set(placeholder, {
        skipped: type,
        config,
        inputData,
        data,
        context
    });
    return false;
}

function renderDom(host, renderer, placeholder, config, props, data, context, inputData) {
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
            const info = {
                config,
                props,
                inputData,
                data,
                context
            };

            if (el.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
                viewEls.set(el, info);

                if (renderer.name) {
                    el.classList.add(`view-${renderer.name}`);
                }

                if (config.className) {
                    let classNames = config.className;

                    if (typeof classNames === 'string' && classNames.startsWith('=')) {
                        classNames = host.queryFn(classNames.slice(1));
                    }

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
            } else {
                for (let child of el.childNodes) {
                    if (fragmentEls.has(child)) {
                        fragmentEls.get(child).unshift(info);
                    } else {
                        fragmentEls.set(child, [info]);
                    }
                }
            }

            placeholder.replaceWith(el);
        });
}

function createRenderContext(host, name) {
    return {
        name,
        // block() {
        //     return `view-${name}`;
        // },
        // blockMod(modifierName, value = true) {
        //     return `${this.block()}_${modifierName}${value === true ? '' : '_' + value}`;
        // },
        // element(elementName) {
        //     return `${this.block()}__${elementName}`;
        // },
        // elementMod(elementName, modifierName, value = true) {
        //     return `${this.element(elementName)}_${modifierName}${value === true ? '' : '_' + value}`;
        // },
        normalizeConfig: host.normalizeConfig.bind(host),
        ensureValidConfig: host.ensureValidConfig.bind(host),
        composeConfig: host.composeConfig.bind(host),
        propsFromConfig: host.propsFromConfig.bind(host),
        render: host.render.bind(host),
        listLimit: host.listLimit.bind(host),
        renderList: host.renderList.bind(host),
        maybeMoreButtons: host.maybeMoreButtons.bind(host),
        renderMoreButton: host.renderMoreButton.bind(host)
    };
}

function render(container, config, data, context) {
    if (Array.isArray(config)) {
        return Promise.all(config.map(config => render.call(this, container, config, data, context)));
    }

    let renderer = null;

    switch (typeof config.view) {
        case 'function':
            renderer = {
                name: false,
                options: STUB_OBJECT,
                render: config.view
            };
            break;

        case 'string':
            if (config.view === 'render') {
                const {
                    config: configQuery = '',
                    context: contextQuery = ''
                } = config;

                renderer = {
                    name: false,
                    options: { tag: false },
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
                    }
                };
            } else if (config.view.startsWith('preset/')) {
                const presetName = config.view.substr(7);

                renderer = {
                    name: false,
                    options: { tag: false },
                    render: this.host.preset.isDefined(presetName)
                        ? this.host.preset.get(presetName).render
                        : () => {}
                };
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

        renderer = this.defaultRenderErrorRenderer;
        config = { type: 'config', reason: errorMsg, config };
    }

    if (!container) {
        container = document.createDocumentFragment();
    }

    const placeholder = container.appendChild(document.createComment(''));

    if (condition('when', this.host, config, data, context, data, placeholder)) {
        // immediately append a view insert point (a placeholder)
        const getData = 'data' in config
            ? Promise.resolve().then(() => this.host.query(config.data, data, context))
            : Promise.resolve(data);

        // resolve data and render a view when ready
        return getData
            .then(newData =>
                condition('whenData', this.host, config, newData, context, data, placeholder)
                    ? renderDom(
                        this.host,
                        renderer,
                        placeholder,
                        config,
                        this.propsFromConfig(config, newData, context),
                        newData,
                        context,
                        data
                    )
                    : null // placeholder.remove()
            )
            .catch(e => {
                renderDom(this.host, this.defaultRenderErrorRenderer, placeholder, STUB_OBJECT, {
                    type: 'render',
                    reason: String(e),
                    config
                });
                console.error(e);
            });
    }

    return Promise.resolve();
}

export default class ViewRenderer extends Dict {
    constructor(host) {
        super();

        this.host = host;
        this.defaultRenderErrorRenderer = createDefaultRenderErrorView(this);
    }

    define(name, render, options) {
        super.define(name, Object.freeze({
            name,
            options: Object.freeze({ ...options }),
            render: typeof render === 'function'
                ? render.bind(createRenderContext(this, name))
                : (el, _, data, context) => this.render(el, render, data, context)
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
            view: this.defaultRenderErrorRenderer.render,
            type: 'config',
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

        for (const [key, value] of Object.entries(config)) {
            // Config only props are not available for view's render
            if (!configOnlyProps.has(key)) {
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

    adoptFragment(fragment, probe) {
        const info = fragmentEls.get(probe);

        if (info) {
            for (const node of fragment.childNodes) {
                fragmentEls.set(node, info);
            }
        }
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

        collectViewTree(this.host.dom.container, { parent: null, children: result }, ignoreNodes);

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
