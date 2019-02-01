/* eslint-env browser */

import { createElement, createText } from '../core/utils/dom.js';

const signatureTypeOrder = [
    'string',
    'number',
    'bigint',
    'boolean',
    'symbol',
    'function',
    'null',
    'undefined',
    'array',
    'object'
];

function collectStat(value, expanded, stat = Object.create(null)) {
    const type =
        value === null
            ? 'null'
            : Array.isArray(value)
                ? 'array'
                : typeof value;

    switch (type) {
        default:
            stat[type] = (stat[type] || 0) + 1;
            break;

        case 'object':
            if ('object' in stat === false) {
                stat.object = {
                    values: new Set(),
                    skipped: false,
                    properties: Object.create(null)
                };
            }

            stat.object.values.add(value);

            for (let key in value) {
                if (!hasOwnProperty.call(value, key)) {
                    continue;
                }

                if (!expanded) {
                    stat.object.skipped = true;
                    break;
                }

                let propMap = stat.object.properties[key];

                if (!propMap) {
                    propMap = stat.object.properties[key] = {
                        count: 1,
                        map: Object.create(null)
                    };
                } else {
                    propMap.count++;
                }

                collectStat(value[key], expanded - 1, propMap.map);
            }

            break;

        case 'array':
            if ('array' in stat === false) {
                stat.array = {
                    values: new Set(),
                    skipped: false,
                    map: Object.create(null)
                };
            }

            stat.array.values.add(value);

            if (!expanded) {
                stat.array.skipped = stat.array.skipped || value.length > 0;
                break;
            }

            for (let i = 0; i < value.length; i++) {
                collectStat(value[i], expanded, stat.array.map);
            }

            break;
    }

    return stat;
}

function renderStat(el, stat, elementToData, offset = '') {
    Object.keys(stat)
        .sort((a, b) => signatureTypeOrder.indexOf(a) - signatureTypeOrder.indexOf(b))
        .forEach((type, idx) => {
            if (idx > 0) {
                el.appendChild(createText(' | '));
            }

            switch (type) {
                default:
                    el.appendChild(createElement('span', 'type', type));
                    break;

                case 'object': {
                    const { values, properties, skipped } = stat[type];
                    const count = values.size;
                    const propertyOffset = offset + '    ';
                    const contentEl = el.appendChild(createElement('span', 'object', '{'));

                    for (let name in properties) {
                        contentEl.appendChild(createText(`\n${propertyOffset}`));
                        contentEl.appendChild(createElement('span', 'property', name));

                        if (properties[name].count !== count) {
                            contentEl.appendChild(createElement('span', 'optional', '?'));
                        }

                        contentEl.appendChild(createText(': '));

                        renderStat(
                            contentEl,
                            properties[name].map,
                            elementToData,
                            propertyOffset
                        );

                        contentEl.appendChild(createText(';'));
                    }

                    if (skipped) {
                        contentEl.classList.add('expand');
                        contentEl.appendChild(createText('…'));
                        elementToData.set(contentEl, {
                            type: 'object',
                            map: stat[type],
                            offset
                        });
                    } else if (contentEl.lastElementChild) {
                        contentEl.appendChild(createText(`\n${offset}`));
                    }

                    contentEl.appendChild(createText('}'));

                    break;
                }

                case 'array':
                    const contentEl = el.appendChild(createElement('span', 'array', '['));

                    if (stat[type].skipped) {
                        contentEl.classList.add('expand');
                        contentEl.appendChild(createText('…'));
                        elementToData.set(contentEl, {
                            type: 'array',
                            map: stat[type],
                            offset
                        });
                    } else {
                        renderStat(contentEl, stat[type].map, elementToData, offset);
                    }

                    contentEl.appendChild(createText(']'));

                    break;
            }
        });
}

export default function(discovery) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        const expandEl = target.closest('.view-signature .expand');
        const data = elementToData.get(expandEl);

        if (expandEl && data) {
            const { type, map, offset } = data;
            const newEl = createElement('span', type);
            const newStat = {};

            map.values.forEach(value => collectStat(value, 1, newStat));

            renderStat(newEl, newStat, elementToData, offset);
            expandEl.replaceWith(newEl);
        }
    };

    // single event handler for all `signature` view instances
    document.addEventListener('click', clickHandler, false);

    discovery.view.define('signature', function(el, config, data) {
        const { expanded } = config;
        const stat = collectStat(data, expanded);

        renderStat(el, stat, elementToData);
    });
}
