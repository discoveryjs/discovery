export function indexPage(host) {
    host.nav.append({
        name: 'index-page',
        when: '#.widget | pageId != defaultPageId',
        data: '{ text: "Index", href: pageLink(#.widget.defaultPageId) }'
    });
}

export function discoveryPage(host) {
    host.nav.append({
        name: 'discovery-page',
        when: '#.widget | pageId != discoveryPageId',
        data: '{ text: "Discover", href: pageLink(#.widget.discoveryPageId) }'
    });
}

export function loadData(host) {
    host.nav.append({
        name: 'load-data',
        when: '#.actions.uploadFile and (#.datasets or (#.widget | pageId != defaultPageId))',
        content: 'text:"Open file…"',
        onClick: '=#.actions.uploadFile'
    });
}

export function darkmodeToggle(host) {
    let detachToggleDarkMode = () => {};
    host.nav.menu.append({
        view: 'block',
        className: ['toggle-menu-item', 'dark-mode-switcher'],
        name: 'dark-mode',
        when: '#.widget | darkmode.mode not in ["disabled", "only"]',
        postRender: (el, opts, data, { widget, hide }) => {
            let selfValue;

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
                    onChange: value => {
                        selfValue = value;
                        widget.darkmode.set(value);
                        hide();
                    },
                    value: newValue,
                    data: [
                        { value: false, text: 'Light' },
                        { value: true, text: 'Dark' },
                        { value: 'auto', text: 'Auto' }
                    ]
                }, null, { widget });
            }, true);
        }
    });
}

export function inspect(host) {
    const suspendSeconds = 3;
    let suspendInspectTimer = null;
    let suspendInspectSeconds = 0;

    host.nav.append({
        name: 'inspect',
        tooltip: {
            position: 'trigger',
            showDelay: true,
            content: 'md:"**Enable view inspection**<br>To suspend enabling inspect mode by ' + suspendSeconds + ' seconds,<br>click the button with Cmd (⌘) or Ctrl-key"'
        },
        onClick: (el, data, context, event) => {
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
                            el.dataset.suspendSeconds = suspendInspectSeconds;
                        }
                    }, 1000);
                }

                suspendInspectSeconds += suspendSeconds;
                el.dataset.suspendSeconds = suspendInspectSeconds;
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
