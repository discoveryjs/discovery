import { createElement, createFragment } from '../../core/utils/dom.js';

const valueButtons = {
    get collapse() {
        return createElement('span', {
            class: 'struct-action-button struct-collapse-value',
            'data-action': 'collapse'
        });
    },
    get signature() {
        return createElement('span', {
            class: 'struct-action-button show-signature',
            'data-action': 'show-signature'
        });
    },
    get actions() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Value actions',
            'data-action': 'value-actions'
        });
    },
    get stringMode() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Toggle string show mode',
            'data-action': 'toggle-string-mode'
        });
    },
    get viewAsTable() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Toggle view as table',
            'data-action': 'toggle-view-as-table'
        });
    },
    get sortKeys() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Toggle key sorting',
            'data-action': 'toggle-sort-keys'
        });
    }
};

export const stringValueProto = createFragment(
    '"',
    valueButtons.collapse,
    valueButtons.actions,
    valueButtons.stringMode,
    createElement('span', 'string-length'),
    createElement('span', 'string-text-wrapper', [
        createElement('span', 'string-text')
    ]),
    '"'
);
export const arrayValueProto = createFragment(
    '[',
    valueButtons.collapse,
    valueButtons.signature,
    valueButtons.actions,
    valueButtons.viewAsTable,
    createElement('span', 'value-size'),
    ']'
);
export const objectValueProto = createFragment(
    '{',
    valueButtons.collapse,
    valueButtons.signature,
    valueButtons.actions,
    valueButtons.viewAsTable,
    valueButtons.sortKeys,
    createElement('span', 'value-size'),
    '}'
);
export const entryProtoEl = createElement('div', 'entry-line');
export const valueProtoEl = createElement('span', 'value');
export const matchProtoEl = createElement('span', 'match');
export const objectKeyProtoEl = createElement('span', 'label', [
    '\xA0\xA0\xA0\xA0',
    createElement('span', 'property'),
    ':\xA0'
]);
