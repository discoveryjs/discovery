import { createElement } from '../../core/utils/dom.js';
import { typeOrder } from './const.js';

export function renderStat(el, stat, elementToData, context, path = [], offset = '', fullStat = null) {
    Object.keys(stat)
        .sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
        .forEach((type, idx, types) => {
            if (idx > 0) {
                el.append(' | ');
            }

            switch (type) {
                default: {
                    const typeEl = el.appendChild(createElement('span', 'type', type));

                    elementToData.set(typeEl, {
                        type: 'type',
                        context,
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
                            context,
                            path,
                            stat,
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
                        context,
                        path,
                        map: stat[type],
                        offset
                    });

                    if (valuesCount > 1 || types.length > 1 || (fullStat !== null && Object.keys(fullStat).length > 1)) {
                        contentEl.appendChild(createElement('span', 'count')).dataset.value = String(valuesCount);
                    }

                    if (sortKeys) {
                        entries.sort(([a], [b]) => a < b ? -1 : (a > b ? 1 : 0));
                    }

                    for (const [name, { count, map }] of entries) {
                        const propertyEl = createElement('span', 'property', [name]); // NOTE: name w/o brackets inserted as HTML

                        elementToData.set(propertyEl, {
                            type: 'property',
                            context,
                            path,
                            stat,
                            name,
                            map
                        });

                        contentEl.append(`\n${propertyOffset}`);
                        contentEl.appendChild(propertyEl);

                        if (count !== valuesCount && dictMode === null) {
                            propertyEl.appendChild(createElement('span', 'optional', '?'));
                        }

                        contentEl.append(': ');
                        renderStat(contentEl, map, elementToData, context, path.concat(dictMode ? '*' : name), propertyOffset);
                        contentEl.append(';');
                    }

                    if (contentEl.lastChild.nodeValue === ';') {
                        contentEl.append(`\n${offset}`);
                    }

                    contentEl.append('}');

                    break;
                }

                case 'array':
                    el.append('[');
                    renderStat(el, stat[type].map, elementToData, context, path, offset);
                    el.append(']');

                    break;

                case 'set':
                    el.append('Set(');
                    renderStat(el, stat[type].map, elementToData, context, path, offset);
                    el.append(')');

                    break;
            }
        });
}
