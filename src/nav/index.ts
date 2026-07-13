import type { ViewModel } from '../main/view-model.js';
import type { NormalizedViewConfig, RawViewConfig, SingleViewConfig, ViewPopup } from '../core/view.js';
import { createElement, createFragment } from '../core/utils/dom.js';
import { ContentRect } from '../core/utils/size.js';
import { version } from '../version.js';

export type NavItemConfig = Omit<SingleViewConfig, 'view'> & { view?: string };
export type NavItem = NormalizedViewConfig & {
    name?: string;
}

export class NavItemArray {
    items: NavItem[];
    host: ViewModel;
    baseConfig: RawViewConfig | undefined;

    constructor(host: ViewModel, baseConfig?: RawViewConfig) {
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

const poweredByDiscoveryEl = createElement('div', 'powered-by-discoveryjs', [
    'powered by ',
    createElement('a', {
        class: 'view-link',
        href: 'https://github.com/discoveryjs/discovery',
        target: '_blank'
    }, 'Discovery.js'),
    ` ${version}`
]);

function createBurgerMenu(nav: ViewModelNavigation) {
    return {
        view: 'nav-button',
        name: 'burger',
        whenData: true,
        data: async () => {
            const fragment = createFragment();

            await nav.host.view.render(fragment, nav.menu.items, nav.data, {
                ...nav.context,
                hide: () => nav.popup?.hide()
            });

            return [...fragment.childNodes]
                .filter(node => node.nodeType === 1 || node.nodeType === 3);
        },
        onClick: (el: HTMLElement, data: (Node | string)[]) => {
            const popup = nav.popup || new nav.host.view.Popup({
                className: 'discovery-nav-popup'
            });

            if (!nav.popup) {
                nav.popup = popup;
                popup.el.addEventListener('click', ({ target }) => {
                    if ((target as HTMLElement).closest('a[href]')) {
                        setTimeout(() => popup.hide(), 50);
                    }
                }, true);

                // auto-destroy popup when the nav is not pointed on it anymore
                const originalHide = popup.hide.bind(popup);
                popup.hide = () => {
                    if (nav.popup !== popup) {
                        popup.destroy();
                    } else {
                        originalHide();
                    }
                };
            }

            popup.toggle(el, (el) =>
                // clone poweredByDiscoveryEl to avoid retaining data/context via DOM nodes
                el.append(...data, poweredByDiscoveryEl.cloneNode(true))
            );
        }
    };
}

export * as buttons from './buttons.js';
export class ViewModelNavigation extends NavItemArray {
    host: ViewModel;
    popup: ViewPopup | null;
    data: any;
    context: any;
    config: RawViewConfig;
    primary: NavItemArray;
    secondary: NavItemArray;
    menu: NavItemArray;
    contentRect: ContentRect;

    constructor(host: ViewModel, baseConfig: RawViewConfig = 'nav-button') {
        super(host, baseConfig);

        this.host = host;
        this.popup = null;
        this.data = null;
        this.context = null;
        this.primary = new NavItemArray(host, 'nav-button');
        this.secondary = this;
        this.menu = new NavItemArray(host, 'menu-item');
        this.config = [
            this.secondary.items,
            createBurgerMenu(this),
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

        // updata data and context for the next render
        this.data = data;
        this.context = {
            ...context,
            widget: this.host
        };

        // reset popup
        if (!this.popup?.visible) {
            this.popup?.destroy();
        }
        this.popup = null;

        // render nav if container is specified
        if (!el) {
            return;
        }

        this.host.view.setViewRoot(el, 'nav', {
            config: this.config,
            data: this.data,
            context: this.context
        });

        el.innerHTML = '';
        return this.host.view.render(el, this.config, this.data, this.context);
    }
};
