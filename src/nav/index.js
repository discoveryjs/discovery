import { createFragment } from '../core/utils/dom.js';
import { ContentRect } from '../core/utils/size.js';

function createNavArray(host, defaults) {
    const items = [];
    const insert = (config, position, ref) => {
        switch (position) {
            case 'after':
                position = items.findIndex(item => item.name === ref);
                if (position === -1) {
                    position = items.length;
                } else {
                    position++;
                }
                break;

            case 'before':
                position = items.findIndex(item => item.name === ref);
                if (position === -1) {
                    position = items.length;
                }
                break;

            default:
                if (position === undefined || isNaN(position) || !isFinite(position)) {
                    position = items.length;
                }
        }

        items.splice(Math.max(0, Math.min(items.length, position)), 0, host.view.composeConfig(defaults, config));
    };

    return Object.assign(items, {
        insert,
        prepend(config) {
            insert(config, 0);
        },
        append(config) {
            insert(config);
        },
        before(name, config) {
            insert(config, 'before', name);
        },
        after(name, config) {
            insert(config, 'after', name);
        },
        replace(name, config) {
            const position = items.findIndex(item => item.name === name);

            if (position !== -1) {
                items[position] = config;
            } else {
                insert(config);
            }
        },
        remove(name) {
            const position = items.findIndex(item => item.name === name);

            if (position !== -1) {
                return items.splice(position, 1)[0];
            }
        }
    });
}

export * as buttons from './buttons.js';
export class WidgetNavigation {
    constructor(host) {
        this.host = host;
        this.popup = null;
        this.primary = createNavArray(host, 'nav-button');
        this.secondary = createNavArray(host, 'nav-button');
        this.menu = createNavArray(host, 'menu-item');
        this.config = [
            this.secondary,
            {
                view: 'nav-button',
                name: 'burger',
                data: () => {
                    const fragment = createFragment();

                    return this.host.view.render(fragment, this.menu, this.host.data, {
                        ...this.host.context,
                        widget: this.host,
                        hide: () => this.popup && this.popup.hide()
                    })
                        .then(() => [...fragment.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3));
                },
                whenData: true,
                onClick: (el, nodes) => {
                    if (!this.popup) {
                        this.popup = new this.host.view.Popup({
                            className: 'discovery-nav-popup'
                        });
                        this.popup.el.addEventListener('click', ({ target }) => {
                            if (target.closest('a[href]')) {
                                setTimeout(() => this.popup.hide(), 50);
                            }
                        }, true);
                    }

                    this.popup.toggle(el, (el) => el.append(...nodes));
                }
            },
            this.primary
        ];

        Object.assign(this, this.secondary);
        this.contentRect = new ContentRect();
        this.contentRect.subscribe(({ width, height }) => {
            const { container } = host.dom;

            if (container) {
                container.style.setProperty('--discovery-nav-width', width + 'px');
                container.style.setProperty('--discovery-nav-height', height + 'px');
            }
        });
    }

    render() {
        const { data, dom } = this.host;
        const el = dom && dom.nav;

        this.contentRect.observe(el);

        if (el) {
            const context = {
                ...this.host.getRenderContext(),
                widget: this.host
            };

            this.host.view.setViewRoot(el, 'nav', {
                config: this.config,
                data,
                context
            });

            el.innerHTML = '';
            this.host.view.render(el, this.config, data, context);
        }
    }
};
