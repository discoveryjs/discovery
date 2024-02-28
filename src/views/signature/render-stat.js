import { createElement, createText } from '../../core/utils/dom.js';
import { typeOrder } from './const.js';

export function renderStat(el, stat, elementToData, path = [], offset = '') {
    Object.keys(stat)
        .sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
        .forEach((type, idx) => {
            if (idx > 0) {
                el.appendChild(createText(' | '));
            }

            switch (type) {
                default: {
                    const typeEl = el.appendChild(createElement('span', 'type', type));

                    elementToData.set(typeEl, {
                        type: 'type',
                        path,
                        stat,
                        name: type
                    });
                    break;
                }

                case 'object': {
                    const values = stat[type];
                    const { properties, dictMode, sortKeys } = values;

                    if (properties === null) {
                        elementToData.set(el.appendChild(createElement('span', 'expand', '{…}')), {
                            type: 'expand',
                            path,
                            map: stat[type],
                            offset
                        });
                        break;
                    }

                    if (properties.size === 0) {
                        el.appendChild(createElement('span', 'object', '{}'));
                        break;
                    }

                    const valuesCount = values.size;
                    const entries = dictMode ? [['[key]', dictMode]] : [...properties.entries()];
                    const propertyOffset = offset + '    ';
                    const contentEl = el.appendChild(createElement('span', 'object', [
                        '{',
                        createElement('span', {
                            'data-action': 'collapse'
                        })
                    ]));

                    if (properties.size > 1) {
                        contentEl.appendChild(
                            createElement('span', {
                                title: 'Toggle dictionary mode (collapse all the values in a single signature)',
                                'data-action': 'dict-mode',
                                'data-enabled': dictMode !== null
                            })
                        );

                        if (entries.some(([key], idx) => idx !== 0 && key < entries[idx - 1][0])) {
                            contentEl.appendChild(
                                createElement('span', {
                                    title: 'Toggle keys sorting',
                                    'data-action': 'sort-keys',
                                    'data-enabled': sortKeys
                                })
                            );
                        }
                    }

                    elementToData.set(contentEl, {
                        type: 'shape',
                        path,
                        map: stat[type],
                        offset
                    });

                    if (valuesCount > 1) {
                        contentEl.appendChild(createElement('span', 'count')).dataset.value = String(valuesCount);
                    }

                    if (sortKeys) {
                        entries.sort(([a], [b]) => a < b ? -1 : (a > b ? 1 : 0));
                    }

                    for (const [name, { count, map }] of entries) {
                        const propertyEl = createElement('span', 'property', [name]); // NOTE: name w/o brackets inserted as HTML

                        elementToData.set(propertyEl, {
                            type: 'property',
                            path,
                            stat,
                            name,
                            map
                        });

                        contentEl.appendChild(createText(`\n${propertyOffset}`));
                        contentEl.appendChild(propertyEl);

                        if (count !== valuesCount && dictMode === null) {
                            propertyEl.appendChild(createElement('span', 'optional', '?'));
                        }

                        contentEl.appendChild(createText(': '));
                        renderStat(contentEl, map, elementToData, path.concat(dictMode ? '*' : name), propertyOffset);
                        contentEl.appendChild(createText(';'));
                    }

                    if (contentEl.lastChild.nodeValue === ';') {
                        contentEl.appendChild(createText(`\n${offset}`));
                    }

                    contentEl.appendChild(createText('}'));

                    break;
                }

                case 'array':
                    el.appendChild(createText('['));
                    renderStat(el, stat[type].map, elementToData, path, offset);
                    el.appendChild(createText(']'));

                    break;

                case 'set':
                    el.appendChild(createText('Set('));
                    renderStat(el, stat[type].map, elementToData, path, offset);
                    el.appendChild(createText(')'));

                    break;
            }
        });
}
