import type { ViewModel } from '../main/view-model.js';
import type { ViewPopup } from '../core/view.js';
import type { SerializedColorSchemeValue } from '../core/color-scheme.js';
import { serializeColorSchemeState } from '../core/color-scheme.js';

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

export function uploadFromClipboard(host: ViewModel) {
    host.nav.before('inspect', {
        name: 'upload-from-clipboard',
        when: '#.actions.uploadDataFromClipboard and (#.datasets or (#.widget | pageId != defaultPageId))',
        text: '',
        onClick: '=#.actions.uploadDataFromClipboard',
        tooltip: {
            position: 'trigger',
            content: 'text:"Paste data from clipboard"'
        }
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

export function colorSchemeToggle(host: ViewModel) {
    let detachToggleColorScheme = () => {};
    host.nav.menu.append({
        view: 'block',
        className: ['toggle-menu-item', 'dark-mode-switcher'],
        name: 'dark-mode',
        when: '#.widget | colorScheme.mode != "only"',
        postRender(el: HTMLElement, opts: any, data: any, { widget, hide }: { widget: ViewModel, hide: ViewPopup['hide'] }) {
            let selfValue: SerializedColorSchemeValue;

            detachToggleColorScheme();
            detachToggleColorScheme = widget.colorScheme.subscribe((value, state) => {
                const newValue = serializeColorSchemeState(state);

                if (newValue === selfValue) {
                    return;
                }

                el.innerHTML = '';
                selfValue = newValue;
                widget.view.render(el, {
                    view: 'toggle-group',
                    beforeToggles: 'text:"Color schema"',
                    onChange(value: SerializedColorSchemeValue) {
                        selfValue = value;
                        widget.colorScheme.set(value);
                        hide();
                    },
                    value: newValue,
                    data: () => [
                        { value: 'light', text: 'Light' },
                        { value: 'dark', text: 'Dark' },
                        { value: 'auto', text: 'Auto' }
                    ] satisfies { value: SerializedColorSchemeValue; text: string; }[]
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
        text: '',
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
