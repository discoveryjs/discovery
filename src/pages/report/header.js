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

export default function(discovery, updateParams) {
    let titleInputEl;
    let dataDateTimeEl;
    let viewDateTimeEl;
    let noeditToggleEl;

    const shareOptionsPopup = new discovery.view.Popup({
        render: (popupEl, _, hide) => discovery.view.render(popupEl, {
            view: 'menu',
            data: [
                { text: 'Copy link to report', action: () => copyText(location) },
                { text: 'Copy report as JSON', action: () => copyText(exportReportAsJson(discovery.pageParams)) }
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
                    noedit: !discovery.pageParams.noedit
                });
            }
        }),
        createElement('button', {
            class: 'share',
            title: 'Share ...',
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
                    dzen: !discovery.pageParams.dzen
                });
            }
        })
    ]);

    const headerEl = createElement('div', 'report-header', [
        createElement('div', { class: 'report-header-text', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                class: 'discovery-hidden-in-dzen',
                placeholder: 'Untitled report',
                oninput: ({ target }) => updateParams({
                    title: target.value
                }, true),
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

            titleInputEl.parentNode.dataset.title = title || titleInputEl.placeholder;
            titleInputEl.value = title;

            noeditToggleEl.classList.toggle('disabled', noedit);
            dataDateTimeEl.innerText = context.createdAt && typeof context.createdAt.toLocaleString === 'function'
                ? 'Data collected at ' + context.createdAt.toLocaleString().replace(',', '') + ' | '
                : '';
            viewDateTimeEl.innerText = 'View built at ' + new Date().toLocaleString().replace(',', '');
        }
    };
}
