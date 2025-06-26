/* eslint-env browser */
import { createElement } from '../../core/utils/dom.js';
import { copyText } from '../../core/utils/copy-text.js';
import { KnownParams, UpdateHostParams } from './types.js';
import { ViewModel } from '../../lib.js';
import { getParamsFromContext } from './params.js';

function quote(str: string) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\t/g, '\\t')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/'/g, '\\\'');
}

function exportStateAsJson(pageParams: Partial<KnownParams>) {
    return `{\n${
        Object.keys(pageParams).reduce(
            (props, k) => typeof pageParams[k] === 'string'
                ? props.concat(`    ${k}: \'${quote(pageParams[k])}\'`)
                : (k === 'graph' || typeof pageParams[k] === 'boolean') && pageParams[k]
                    ? props.concat(`    ${k}: ${JSON.stringify(pageParams[k])}`)
                    : props,
            [] as string[]
        ).join(',\n')
    }\n}`;
}

function toDate(value: number | string | Date) {
    if (value && (typeof value === 'number' || typeof value === 'string')) {
        const date = new Date(value);

        return !isNaN(Number(date)) ? date : null;
    }

    return value instanceof Date ? value : null;
}

function formatDate(value: number | string | Date) {
    const date = toDate(value);

    if (date) {
        return date
            .toISOString()
            .replace(/^(\d{4})-(\d{2})-(\d{2})T([\d:]+).*/, '$3/$2/$1 $4 UTC');
    }

    return null;
}

export default function(host: ViewModel, updateParams: UpdateHostParams) {
    let titleInputEl: HTMLInputElement;
    let dataDateTimeEl: HTMLElement;
    let viewDateTimeEl: HTMLElement;
    let noeditToggleEl: HTMLElement;

    const shareOptionsPopup = new host.view.Popup({
        render: (popupEl, _, hide) => host.view.render(popupEl, {
            view: 'menu',
            data: () => [
                {
                    text: 'Copy page permalink',
                    disabled: !host.action.has('permalink'),
                    action: async () => copyText(await host.action.call('permalink', host.pageHash) as string)
                },
                {
                    text: 'Copy page hash',
                    action: () => copyText(host.pageHash)
                },
                {
                    text: 'Copy page as JSON',
                    action: () => copyText(exportStateAsJson(host.pageParams))
                }
            ],
            onClick(item: { action: () => void }) {
                hide();
                item.action();
            }
        })
    });

    const actionsPanel = createElement('div', 'discovery-actions', [
        noeditToggleEl = createElement('button', {
            class: 'edit-mode discovery-hidden-in-dzen',
            title: 'Toggle edit mode',
            onclick(this) {
                this.blur();
                updateParams({
                    noedit: !host.pageParams.noedit
                });
            }
        }),
        createElement('button', {
            class: 'share',
            title: 'Sharing',
            onclick() {
                this.blur();
                shareOptionsPopup.show(this);
            }
        }),
        createElement('button', {
            class: 'toggle-fullscreen',
            title: 'Toggle full page mode',
            onclick() {
                this.blur();
                updateParams({
                    dzen: !host.pageParams.dzen
                });
            }
        })
    ]);

    const updateHeaderTitle = (target: HTMLInputElement) => {
        (target.parentNode as HTMLElement).dataset.title = target.value || target.placeholder;
    };
    const headerEl = createElement('div', 'discovery-header', [
        createElement('div', { class: 'discovery-header-text', 'data-title': '\xA0' }, [
            titleInputEl = createElement('input', {
                class: 'discovery-hidden-in-dzen',
                placeholder: 'Untitled discovery',
                oninput() {
                    updateHeaderTitle(this);
                },
                onchange() {
                    updateHeaderTitle(this);
                    updateParams({
                        title: this.value
                    }, true);
                },
                onkeypress(e) {
                    if (e.key === 'Enter') {
                        this.blur();
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
            actionsPanel,
            headerEl
        ],
        render(data: unknown, context: unknown) {
            const { title, noedit } = getParamsFromContext(context);
            const createdAt = formatDate((context as any)?.datasets?.[0]?.resource?.createdAt);

            titleInputEl.value = title || '';
            updateHeaderTitle(titleInputEl);

            noeditToggleEl.classList.toggle('disabled', noedit);
            dataDateTimeEl.innerText = createdAt
                ? 'Data collected at ' + createdAt + ' | '
                : '';
            viewDateTimeEl.innerText = 'Rendered at ' + formatDate(new Date());
        }
    };
}
