import type { ViewModel } from '../main/view-model.js';
import type { ViewPopup } from '../core/view.js';

export function indexPage(host: ViewModel) {
    host.nav.append({
        name: 'index-page',
        when: '#.widget | pageId != defaultPageId',
        text: 'Index',
        href: '=pageLink(#.widget.defaultPageId)'
    });
}

export function discoveryPage(host: ViewModel) {
    host.nav.append({
        name: 'discovery-page',
        when: '#.widget | pageId != discoveryPageId',
        text: 'Discover',
        href: '=pageLink(#.widget.discoveryPageId)'
    });
}

export function uploadFile(host: ViewModel) {
    host.nav.before('inspect', {
        name: 'open-file',
        when: '#.actions.uploadFile and (#.datasets or (#.widget | pageId != defaultPageId))',
        text: 'Open file…',
        onClick: '=#.actions.uploadFile'
    });
}

export function unloadData(host: ViewModel) {
    host.nav.menu.append({
        name: 'unload-data',
        when: '#.actions.unloadData and #.datasets',
        content: 'text:"Unload data"',
        onClick: '=#.actions.unloadData'
    });
}

export function darkmodeToggle(host: ViewModel) {
    let detachToggleDarkMode = () => {};
    host.nav.menu.append({
        view: 'block',
        className: ['toggle-menu-item', 'dark-mode-switcher'],
        name: 'dark-mode',
        when: '#.widget | darkmode.mode not in ["disabled", "only"]',
        postRender(el: HTMLElement, opts: any, data: any, { widget, hide }: { widget: ViewModel, hide: ViewPopup['hide'] }) {
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
                    onChange(value: boolean | 'auto') {
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

export function inspect(host: ViewModel) {
    const suspendSeconds = 3;
    let suspendInspectTimer: ReturnType<typeof setTimeout> | null = null;
    let suspendInspectSeconds = 0;

    host.nav.append({
        name: 'inspect',
        when: '#.widget.inspectMode',
        tooltip: {
            position: 'trigger',
            showDelay: true,
            content: 'md:"**Enable view inspection**<br>To suspend enabling inspect mode by ' + suspendSeconds + ' seconds,<br>click the button with Cmd (⌘) or Ctrl-key"'
        },
        onClick(el: HTMLElement, data: any, context: any, event: MouseEvent) {
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
