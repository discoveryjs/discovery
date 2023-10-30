/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import copyText from '../../core/utils/copy-text.js';

function exportReportAsJson(pageParams) {
    const quote = s => s.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/'/g, '\\\'');
    let { title, query, view } = pageParams;
    const res = { title, query, view };

    return `{\n${
        Object.keys(res).reduce(
            (props, k) => props.concat(res[k] ? `    ${k}: \'${quote(res[k])}\'` : []),
            []
        ).join(',\n')
    }\n}`;
}

function toDate(value) {
    if (value && (typeof value === 'number' || typeof value === 'string')) {
        const date = new Date(value);

        return !isNaN(date) ? date : null;
    }

    return value instanceof Date ? value : null;
}

function formatDate(value) {
    const date = toDate(value);

    if (date) {
        return date
            .toISOString()
            .replace(/^(\d{4})-(\d{2})-(\d{2})T([\d:]+).*/, '$3/$2/$1 $4 UTC');
    }

    return null;
}

export default function(host, updateParams) {
    let titleInputEl;
    let dataDateTimeEl;
    let viewDateTimeEl;
    let noeditToggleEl;

    const shareOptionsPopup = new host.view.Popup({
        render: (popupEl, _, hide) => host.view.render(popupEl, {
            view: 'menu',
            data: [
                {
                    text: 'Copy report permalink',
                    disabled: !host.action.has('permalink'),
                    action: async () => copyText(await host.action.call('permalink', host.pageHash))
                },
                {
                    text: 'Copy report as page hash',
                    action: () => copyText(host.pageHash)
                },
                {
                    text: 'Copy report as JSON',
                    action: () => copyText(exportReportAsJson(host.pageParams))
                }
            ],
            onClick(item) {
                hide();
                item.action();
            }
        })
    });

    const reportActions = createElement('div', 'report-actions', [
        noeditToggleEl = createElement('button', {
            class: 'edit-mode discovery-hidden-in-dzen',
            title: 'Toggle edit mode',
            onclick: ({ target }) => {
                target.blur();
                updateParams({
                    noedit: !host.pageParams.noedit
                });
            }
        }),
        createElement('button', {
            class: 'share',
            title: 'Sharing',
            onclick: ({ target }) => {
                target.blur();
                shareOptionsPopup.show(target);
            }
        }),
        createElement('button', {
            class: 'toggle-fullscreen',
            title: 'Toggle full page mode',
            onclick: ({ target }) => {
                target.blur();
                updateParams({
                    dzen: !host.pageParams.dzen
                });
            }
        })
    ]);

    const updateHeaderTitle = target => {
        target.parentNode.dataset.title = target.value || target.placeholder;
    };
    const headerEl = createElement('div', 'report-header', [
        createElement('div', { class: 'report-header-text', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                class: 'discovery-hidden-in-dzen',
                placeholder: 'Untitled report',
                oninput: ({ target }) => {
                    updateHeaderTitle(target);
                },
                onchange: ({ target }) => {
                    updateHeaderTitle(target);
                    updateParams({
                        title: target.value
                    }, true);
                },
                onkeypress: (e) => {
                    if (e.charCode === 13 || e.keyCode === 13) {
                        e.target.blur();
                    }
                }
            }),
            createElement('span', 'timestamp', [
                dataDateTimeEl = createElement('span', null, '&nbsp;'),
                viewDateTimeEl = createElement('span')
            ])
        ])
    ]);

    return {
        el: [
            reportActions,
            headerEl
        ],
        render(data, context) {
            const { title, noedit } = context.params;
            const createdAt = formatDate(context.datasets?.[0]?.resource?.createdAt);

            titleInputEl.value = title;
            updateHeaderTitle(titleInputEl);

            noeditToggleEl.classList.toggle('disabled', noedit);
            dataDateTimeEl.innerText = createdAt
                ? 'Data collected at ' + createdAt + ' | '
                : '';
            viewDateTimeEl.innerText = 'Rendered at ' + formatDate(new Date());
        }
    };
}
