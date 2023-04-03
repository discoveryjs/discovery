export function indexPage(host) {
    host.nav.append({
        name: 'index-page',
        when: '#.widget | pageId != defaultPageId',
        data: '{ text: "Index", href: pageLink(#.widget.defaultPageId) }'
    });
}

export function reportPage(host) {
    host.nav.append({
        name: 'report-page',
        when: '#.widget | pageId != reportPageId',
        data: '{ text: "Make report", href: pageLink(#.widget.reportPageId) }'
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
        when: '#.widget | darkmode.mode != "disabled"',
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
    host.nav.append({
        name: 'inspect',
        onClick: () => host.inspectMode.set(!host.inspectMode.value),
        postRender(el) {
            el.title = 'Enable view inspection';
        }
    });
}
