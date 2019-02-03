/* eslint-env browser */

import { createElement, createText, createFragment } from '../core/utils/dom.js';

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

function collectObjectMap(value, expanded, objectStat) {
    for (let key in value) {
        if (!hasOwnProperty.call(value, key)) {
            continue;
        }

        if (!expanded) {
            objectStat.properties = null;
            break;
        }

        let propMap = objectStat.properties[key];

        if (!propMap) {
            propMap = objectStat.properties[key] = {
                count: 1,
                map: Object.create(null)
            };
        } else {
            propMap.count++;
        }

        collectStat(value[key], expanded - 1, propMap.map);
    }
}

function collectStat(value, expanded, stat = Object.create(null)) {
    const type =
        value === null
            ? 'null'
            : Array.isArray(value)
                ? 'array'
                : typeof value;

    switch (type) {
        default:
            if (type in stat === false) {
                stat[type] = new Map();
            }

            stat[type].set(value, (stat[type].get(value) || 0) + 1);
            break;

        case 'object':
            if ('object' in stat === false) {
                stat.object = {
                    values: new Set(),
                    count: 0,
                    properties: Object.create(null)
                };
            }

            stat.object.count++;

            if (!stat.object.values.has(value)) {
                stat.object.values.add(value);
                collectObjectMap(value, expanded, stat.object);
            }

            break;

        case 'array':
            if ('array' in stat === false) {
                stat.array = {
                    values: new Set(),
                    count: 0,
                    map: Object.create(null)
                };
            }

            stat.array.count++;
            stat.array.values.add(value);

            for (let i = 0; i < value.length; i++) {
                collectStat(value[i], expanded, stat.array.map);
            }

            break;
    }

    return stat;
}

function getStatCount(stat) {
    let count = 0;

    for (let type in stat) {
        switch (type) {
            default:
                stat[type].forEach(occurrences => count += occurrences);
                break;

            case 'object':
            case 'array':
                count += stat[type].count;
                break;
        }
    }

    return count;
}

function renderStat(el, stat, elementToData, offset = '') {
    Object.keys(stat)
        .sort((a, b) => signatureTypeOrder.indexOf(a) - signatureTypeOrder.indexOf(b))
        .forEach((type, idx) => {
            if (idx > 0) {
                el.appendChild(createText(' | '));
            }

            switch (type) {
                default: {
                    const typeEl = el.appendChild(createElement('span', 'type', type));

                    elementToData.set(typeEl, {
                        type: 'type',
                        stat,
                        name: type
                    });
                    break;
                }

                case 'object': {
                    const { values, count, properties } = stat[type];

                    if (properties === null) {
                        elementToData.set(el.appendChild(createElement('span', 'expand', '{…}')), {
                            type: 'expand',
                            map: stat[type],
                            offset
                        });
                        break;
                    }

                    const totalCount = values.size;
                    const propertyOffset = offset + '    ';
                    const contentEl = el.appendChild(createElement('span', 'object', [
                        '{',
                        createElement('span', 'collapse')
                    ]));

                    elementToData.set(contentEl, {
                        type: 'collapse',
                        map: stat[type],
                        offset
                    });

                    if (count > 1) {
                        contentEl.appendChild(createElement('span', 'count', String(count)));
                    }

                    for (let name in properties) {
                        const propertyEl = createElement('span', 'property', name);
                        const { count, map } = properties[name];

                        elementToData.set(propertyEl, {
                            type: 'property',
                            stat,
                            name,
                            map
                        });

                        contentEl.appendChild(createText(`\n${propertyOffset}`));
                        contentEl.appendChild(propertyEl);

                        if (count !== totalCount) {
                            propertyEl.appendChild(createElement('span', 'optional', '?'));
                        }

                        contentEl.appendChild(createText(': '));
                        renderStat(contentEl, map, elementToData, propertyOffset);
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
                    renderStat(el, stat[type].map, elementToData, offset);
                    el.appendChild(createText(']'));

                    break;
            }
        });
}

export default function(discovery) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        let activeEl = target.closest(`
            .view-signature .expand,
            .view-signature .collapse,
            .view-signature .property,
            .view-signature .type
        `);

        if (!activeEl) {
            return;
        }

        if (activeEl.classList.contains('collapse')) {
            activeEl = activeEl.parentNode;
        }

        const data = elementToData.get(activeEl);

        if (data) {
            const { type, map, offset } = data;

            switch (type) {
                case 'property':
                case 'type':
                    // TODO
                    console.log(data);
                    break;

                case 'expand':
                case 'collapse': {
                    const fragment = createFragment();

                    if (map.properties === null) {
                        map.properties = Object.create(null);
                        map.values.forEach(value => collectObjectMap(value, 1, map));
                    } else {
                        map.properties = null;
                    }

                    renderStat(fragment, { object: map }, elementToData, offset);
                    activeEl.replaceWith(fragment);

                    break;
                }
            }
        }
    };

    const createRender = {
        property: data => el => {
            const count = data.stat.object.properties[data.name].count;
            const total = data.stat.object.count;
            const output = {
                total,
                count,
                percent: (100 * count / total).toFixed(1) + '%'
            };

            discovery.view.render(el, [
                {
                    view: 'block',
                    content: `text:
                        count = total
                            ? "Always defined"
                            : "Defined in " + count + " of " + total + " objects (" + percent + ")"
                    `
                },
                {
                    view: 'struct',
                    expanded: 2
                }
            ], output, {});
        },
        type: data => el => {
            const stat = data.stat[data.name];
            const total = getStatCount(data.stat);
            let output = data;

            switch (data.name) {
                case 'number': {
                    const values = [];
                    let sum = 0;
                    let count = 0;
                    let duplicated = 0;
                    let min = Infinity;
                    let max = -Infinity;

                    stat.forEach((occurrences, value) => {
                        values.push({
                            count: occurrences,
                            value
                        });

                        sum += value * occurrences;
                        count += occurrences;

                        if (occurrences > 1) {
                            duplicated++;
                        }

                        if (value < min) {
                            min = value;
                        }

                        if (value > max) {
                            max = value;
                        }
                    });

                    output = {
                        count,
                        distinct: stat.size,
                        duplicated,
                        min,
                        max,
                        sum,
                        avg: sum / count,
                        values: values.sort((a, b) => b.count - a.count || a.value - b.value)
                    };

                    break;
                }

                default: {
                    const values = [];
                    let count = 0;
                    let duplicated = 0;

                    stat.forEach((occurrences, value) => {
                        values.push({
                            count: occurrences,
                            value
                        });

                        count += occurrences;

                        if (occurrences > 1) {
                            duplicated++;
                        }
                    });

                    output = {
                        count,
                        distinct: stat.size,
                        duplicated,
                        values: values.sort((a, b) => b.count - a.count || a.value - b.value)
                    };

                    break;
                }
            }

            discovery.view.render(el, [
                {
                    view: 'block',
                    content: `text:
                        count = total
                            ? "Always used this type"
                            : "Type used in " + count + " of " + total + " cases (" + percent + ")"
                    `
                },
                {
                    view: 'struct',
                    expanded: 2
                }
            ], {
                total,
                percent: (100 * output.count / total).toFixed(1) + '%',
                ...output
            });
        }
    };

    // single event handler for all `signature` view instances
    document.addEventListener('click', clickHandler, false);

    new discovery.view.Popup({
        hoverTriggers: `
            .view-signature .property,
            .view-signature .type
        `,
        hoverElementToOptions: function(triggerEl) {
            const data = elementToData.get(triggerEl);

            return {
                render: createRender[data.type](data)
            };
        }
    });

    discovery.view.define('signature', function(el, config, data) {
        const { expanded } = config;
        const stat = collectStat(data, expanded);

        renderStat(el, stat, elementToData);
    });
}
