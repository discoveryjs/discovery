import { createElement, createFragment } from '../core/utils/dom.js';
import { ContentRect } from '../core/utils/size.js';
import { version } from '../version.js';
import type { Widget } from '../main/widget.js';
import type { NormalizedViewConfig, RawViewConfig, SingleViewConfig, ViewPopup } from '../core/view.js';

export type NavItemConfig = Omit<SingleViewConfig, 'view'> & { view?: string };
export type NavItem = NormalizedViewConfig & {
    name?: string;
}

export class NavItemArray {
    items: NavItem[];
    host: Widget;
    baseConfig: RawViewConfig | undefined;

    constructor(host: Widget, baseConfig?: RawViewConfig) {
        this.host = host;
        this.baseConfig = baseConfig;
        this.items = [];
    }

    insert(config: NavItemConfig, position?: 'before' | 'after' | number, ref?: string) {
        switch (position) {
            case 'after':
                position = this.items.findIndex(item => item.name === ref);
                if (position === -1) {
                    position = this.items.length;
                } else {
                    position++;
                }
                break;

            case 'before':
                position = this.items.findIndex(item => item.name === ref);
                if (position === -1) {
                    position = this.items.length;
                }
                break;

            default:
                if (position === undefined || isNaN(position) || !isFinite(position)) {
                    position = this.items.length;
                }
        }

        position = Math.max(0, Math.min(this.items.length, position));
        const composedConfig = this.host.view.composeConfig(this.baseConfig, config);

        this.items.splice(position, 0, composedConfig);
    }

    prepend(config: NavItemConfig) {
        this.insert(config, 0);
    }
    append(config: NavItemConfig) {
        this.insert(config);
    }
    before(name: string, config: NavItemConfig) {
        this.insert(config, 'before', name);
    }
    after(name: string, config: NavItemConfig) {
        this.insert(config, 'after', name);
    }
    replace(name: string, config: NavItemConfig) {
        const position = this.items.findIndex(item => item.name === name);

        if (position !== -1) {
            this.items[position] = this.host.view.composeConfig(this.baseConfig, config);
        } else {
            this.insert(config);
        }
    }
    remove(name: string) {
        const position = this.items.findIndex(item => item.name === name);

        if (position !== -1) {
            return this.items.splice(position, 1)[0];
        }
    }
}

export * as buttons from './buttons.js';
export class WidgetNavigation extends NavItemArray {
    host: Widget;
    popup: ViewPopup | null;
    data: any;
    context: any;
    config: RawViewConfig;
    primary: NavItemArray;
    secondary: NavItemArray;
    menu: NavItemArray;
    contentRect: ContentRect;

    constructor(host: Widget, baseConfig: RawViewConfig = 'nav-button') {
        super(host, baseConfig);

        const poweredByDiscovery = createElement('div', 'powered-by-discoveryjs', [
            'powered by ',
            createElement('a', {
                class: 'view-link',
                href: 'https://github.com/discoveryjs/discovery',
                target: '_blank'
            }, 'Discovery.js'),
            ` ${version}`
        ]);

        this.host = host;
        this.popup = null;
        this.data = null;
        this.context = null;
        this.primary = new NavItemArray(host, 'nav-button');
        this.secondary = this;
        this.menu = new NavItemArray(host, 'menu-item');
        this.config = [
            this.secondary.items,
            {
                view: 'nav-button',
                name: 'burger',
                whenData: true,
                data: async () => {
                    const fragment = createFragment();

                    await this.host.view.render(fragment, this.menu.items, this.host.data, {
                        ...this.context,
                        hide: () => this.popup?.hide()
                    });

                    return [...fragment.childNodes]
                        .filter(node => node.nodeType === 1 || node.nodeType === 3);
                },
                onClick: (el: HTMLElement, nodes: (Node | string)[]) => {
                    const popup = this.popup || new this.host.view.Popup({
                        className: 'discovery-nav-popup'
                    });

                    if (!this.popup) {
                        this.popup = popup;
                        popup.el.addEventListener('click', ({ target }) => {
                            if ((target as HTMLElement).closest('a[href]')) {
                                setTimeout(() => popup.hide(), 50);
                            }
                        }, true);
                    }

                    popup.toggle(el, (el) => el.append(...nodes, poweredByDiscovery));
                }
            },
            this.primary.items
        ];

        this.contentRect = new ContentRect();
        this.contentRect.subscribe((size) => {
            const { container } = host.dom;

            if (container && size) {
                const { width, height } = size;

                container.style.setProperty('--discovery-nav-width', width + 'px');
                container.style.setProperty('--discovery-nav-height', height + 'px');
            }
        });
    }

    render(el: HTMLElement, data: any, context: any) {
        this.contentRect.observe(el);

        if (el) {
            this.data = data;
            this.context = {
                ...context,
                widget: this.host
            };

            this.host.view.setViewRoot(el, 'nav', {
                config: this.config,
                data: this.data,
                context: this.context
            });

            el.innerHTML = '';
            this.host.view.render(el, this.config, this.data, this.context);
        }
    }
};
