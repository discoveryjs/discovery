import type { ViewPopup } from '../core/view.js';
import type { Widget } from '../main/widget.js';

export function indexPage(host: Widget) {
    host.nav.append({
        name: 'index-page',
        when: '#.widget | pageId != defaultPageId',
        data: '{ text: "Index", href: pageLink(#.widget.defaultPageId) }'
    });
}

export function discoveryPage(host: Widget) {
    host.nav.append({
        name: 'discovery-page',
        when: '#.widget | pageId != discoveryPageId',
        data: '{ text: "Discover", href: pageLink(#.widget.discoveryPageId) }'
    });
}

export function loadData(host: Widget) {
    host.nav.append({
        name: 'load-data',
        when: '#.actions.uploadFile and (#.datasets or (#.widget | pageId != defaultPageId))',
        content: 'text:"Open file…"',
        onClick: '=#.actions.uploadFile'
    });
}

export function darkmodeToggle(host: Widget) {
    let detachToggleDarkMode = () => {};
    host.nav.menu.append({
        view: 'block',
        className: ['toggle-menu-item', 'dark-mode-switcher'],
        name: 'dark-mode',
        when: '#.widget | darkmode.mode not in ["disabled", "only"]',
        postRender: (el: HTMLElement, opts: any, data: any, { widget, hide }: { widget: Widget, hide: ViewPopup['hide'] }) => {
            let selfValue: boolean | 'auto';

            detachToggleDarkMode();
            detachToggleDarkMode = widget.darkmode.subscribe((value, mode) => {
                const newValue = mode === 'auto' ? 'auto' : value;

                if (newValue === selfValue) {
                    return;
                }

                el.innerHTML = '';
                selfValue = newValue;
                widget.view.render(el, {
                    view: 'toggle-group',
                    beforeToggles: 'text:"Color schema"',
                    onChange: (value: boolean | 'auto') => {
                        selfValue = value;
                        widget.darkmode.set(value);
                        hide();
                    },
                    value: newValue,
                    data: () => [
                        { value: false, text: 'Light' },
                        { value: true, text: 'Dark' },
                        { value: 'auto', text: 'Auto' }
                    ]
                }, null, { widget });
            }, true);
        }
    });
}

export function inspect(host: Widget) {
    const suspendSeconds = 3;
    let suspendInspectTimer: ReturnType<typeof setTimeout> | null = null;
    let suspendInspectSeconds = 0;

    host.nav.append({
        name: 'inspect',
        tooltip: {
            position: 'trigger',
            showDelay: true,
            content: 'md:"**Enable view inspection**<br>To suspend enabling inspect mode by ' + suspendSeconds + ' seconds,<br>click the button with Cmd (⌘) or Ctrl-key"'
        },
        onClick: (el: HTMLElement, data: any, context: any, event: MouseEvent) => {
            if (!host.inspectMode.value && (event.metaKey || event.ctrlKey)) {
                if (suspendInspectTimer === null) {
                    suspendInspectSeconds = 0;
                    suspendInspectTimer = setTimeout(function tick() {
                        suspendInspectSeconds--;
                        if (suspendInspectSeconds === 0) {
                            suspendInspectTimer = null;
                            delete el.dataset.suspendSeconds;
                            host.inspectMode.set(true);
                        } else {
                            suspendInspectTimer = setTimeout(tick, 1000);
                            el.dataset.suspendSeconds = String(suspendInspectSeconds);
                        }
                    }, 1000);
                }

                suspendInspectSeconds += suspendSeconds;
                el.dataset.suspendSeconds = String(suspendInspectSeconds);
            } else if (suspendInspectTimer !== null) {
                clearTimeout(suspendInspectTimer);
                suspendInspectTimer = null;
                delete el.dataset.suspendSeconds;
            } else {
                host.view.tooltip?.hide();
                host.inspectMode.set(!host.inspectMode.value);
            }
        }
    });
}
