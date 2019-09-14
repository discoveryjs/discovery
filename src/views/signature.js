/* eslint-env browser */

import { createElement, createText, createFragment } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';

const colors = ['#7ede78', '#f5f061', '#f7b28a', '#af8af7', '#61a3f5', '#ef9898', '#80ccb4', '#b1ae8a', '#e290d3', '#91d9ea', '#bbb'];
const signatureTypeOrder = [
    'null',
    'undefined',
    'string',
    'number',
    'bigint',
    'boolean',
    'symbol',
    'function',
    'array',
    'object'
];

function fixedNum(num, prec) {
    return num.toFixed(prec).replace(/\.?0+$/, '');
}

function svgPieChart(slices) {
    function getCoordinatesForPercent(percent) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    let cumulativePercent = 0;

    return [
        '<svg viewBox="-1 -1 2 2" class="pie">',
        ...slices.map(slice => {
            // destructuring assignment sets the two variables at once
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);

            // each slice starts where the last slice ended, so keep a cumulative percent
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent += slice.percent);

            // if the slice is more than 50%, take the large arc (the long way around)
            const largeArcFlag = slice.percent > .5 ? 1 : 0;

            // create an array and join it just for code readability
            const pathData = [
                `M ${startX} ${startY}`, // Move
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                'L 0 0' // Line
            ].join(' ');

            // create a <path> and append it to the <svg> element
            return `<path d="${pathData}" fill="${slice.color}"/>`;
        }),
        '</svg>'
    ].join('\n');
}

function collectObjectMap(value, expanded, objectStat) {
    for (let key in value) {
        if (!hasOwnProperty.call(value, key)) {
            continue;
        }

        if (!expanded) {
            objectStat.properties = null;
            break;
        }

        let propMap;

        if (key in objectStat.properties) {
            propMap = objectStat.properties[key];
            propMap.count++;
        } else {
            propMap = objectStat.properties[key] = {
                count: 1,
                map: Object.create(null)
            };
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
                stat.object = new Map();
                stat.object.count = 0;
                stat.object.properties = Object.create(null);
            }

            stat.object.count++;

            if (!stat.object.has(value)) {
                stat.object.set(value, 1);
                collectObjectMap(value, expanded, stat.object);
            } else {
                stat.object.set(value, stat.object.get(value) + 1);
            }

            break;

        case 'array':
            if ('array' in stat === false) {
                stat.array = new Map();
                stat.array.count = 0;
                stat.array.map = Object.create(null);
            }

            stat.array.count++;
            stat.array.set(value, (stat.array.get(value) || 0) + 1);

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
        stat[type].forEach(occurrences => count += occurrences);
    }

    return count;
}

function getStatCounts(stat) {
    let result = Object.create(null);

    for (let type in stat) {
        result[type] = 0;
        stat[type].forEach(occurrences => result[type] += occurrences);
    }

    return result;
}

function renderStat(el, stat, elementToData, path = [], offset = '') {
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
                        path,
                        stat,
                        name: type
                    });
                    break;
                }

                case 'object': {
                    const values = stat[type];
                    const { properties } = stat[type];

                    if (properties === null) {
                        elementToData.set(el.appendChild(createElement('span', 'expand', '{…}')), {
                            type: 'expand',
                            path,
                            map: stat[type],
                            offset
                        });
                        break;
                    }

                    const valuesCount = values.size;
                    const propertyOffset = offset + '    ';
                    const contentEl = el.appendChild(createElement('span', 'object', [
                        '{',
                        createElement('span', 'collapse')
                    ]));

                    elementToData.set(contentEl, {
                        type: 'collapse',
                        path,
                        map: stat[type],
                        offset
                    });

                    if (valuesCount > 1) {
                        contentEl.appendChild(createElement('span', 'count')).dataset.value = String(valuesCount);
                    }

                    for (let name in properties) {
                        const propertyEl = createElement('span', 'property', [name]); // NOTE: name w/o brackets inserted as HTML
                        const { count, map } = properties[name];

                        elementToData.set(propertyEl, {
                            type: 'property',
                            path,
                            stat,
                            name,
                            map
                        });

                        contentEl.appendChild(createText(`\n${propertyOffset}`));
                        contentEl.appendChild(propertyEl);

                        if (count !== valuesCount) {
                            propertyEl.appendChild(createElement('span', 'optional', '?'));
                        }

                        contentEl.appendChild(createText(': '));
                        renderStat(contentEl, map, elementToData, path.concat(name), propertyOffset);
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
            }
        });
}

function renderPropertyDetails(el, data, discovery) {
    const { count, map } = data.stat.object.properties[data.name];
    const total = data.stat.object.count;
    const output = {
        name: data.name,
        path: data.path,
        total,
        count,
        percent: fixedNum(100 * count / total, 1) + '%'
    };

    discovery.view.render(el, [
        {
            view: 'inline-list',
            when: 'path',
            className: 'path',
            data: 'path'
        },
        {
            view: 'h1',
            className: 'property',
            content: [
                'text:name',
                {
                    view: 'html',
                    when: 'count != total',
                    data: `"<span class=\\"usage-stat optional\\">" + (
                        "(in <span class=\\"num\\">" + count + "</span> of <span class=\\"num\\">" + total + "</span> objects, <span class=\\"num\\">" + percent + "</span>)"
                    ) + "</span>"`
                }
            ]
        }
    ], output, {});

    renderTypeStat(el, {
        map,
        count
    }, discovery);
}

function renderTypeStat(el, { map, count }, discovery) {
    const typeCounts = getStatCounts(map);
    const typeStat = [];
    const output = {
        count,
        typeStat
    };

    const types = signatureTypeOrder.filter(type => type in map);
    Object.entries(typeCounts).sort(([,a], [,b]) => a - b).reverse().forEach(([name, val], idx) => {
        typeStat.push({
            name: escapeHtml(name),
            count: val,
            percent: val / count,
            percent100: fixedNum(100 * val / count, 1),
            color: colors[idx]
        });
    });

    discovery.view.render(el, {
        view: 'block',
        when: 'typeStat.size() > 1',
        data: 'typeStat',
        className: 'pie-stat',
        content: [
            {
                view: 'block',
                content: {
                    view: 'html',
                    data: svgPieChart
                }
            },
            {
                view: 'block',
                content: [
                    'html:"<span class=\\"list-header\\">Types usage:</span>"',
                    {
                        view: 'list',
                        item: `html:
                            "<span class=\\"dot\\" style=\\"--size: 10px; background-color: " + color + "\\"></span> " +
                            "<span class=\\"caption\\">" + name + "</span>" +
                            "<span class=\\"times\\"> × " + count + " (" + percent100 + "%)</span>"
                        `
                    }
                ]
            }
        ]
    }, output, {});

    types.forEach((name) => {
        renderTypeDetails(el, { name, stat: map }, discovery);
    });
}

function renderTypeDetails(el, data, discovery) {
    const stat = data.stat[data.name];
    const total = getStatCount(data.stat);
    const renderSections = [];
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
                avg: fixedNum(sum / count, 3),
                values: values.sort((a, b) => b.count - a.count || a.value - b.value)
            };

            renderSections.push({
                view: 'block',
                className: 'overview-stat',
                content: `html:
                    "range: (min) <span class=\\"num\\">" + min + "</span> ... " +
                    "<span class=\\"num\\">" + max + "</span> (max), " +
                    "avg: <span class=\\"num\\">" + avg + "</span>"
                `
            });

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
                values: data.name === 'object' || data.name === 'array'
                    ? values.sort((a, b) => b.count - a.count)
                    : values.sort((a, b) => b.count - a.count || (a.value > b.value) || -(a.value < b.value))
            };

            break;
        }
    }

    if (data.name !== 'undefined' && data.name !== 'null') {
        renderSections.unshift({
            view: 'block',
            className: 'overview-stat',
            content: [
                'html:"<span class=\\"num\\">" + count + "</span> values, "',
                {
                    view: 'switch',
                    content: [
                        { when: 'count = distinct', content: 'text:"all unique, no duplicates"' },
                        { content: [
                            'html:"<span class=\\"num\\">" + distinct + "</span> unique, "',
                            'html:duplicated = distinct ? "all occur more than once" : "<span class=\\"num\\">" + duplicated + "</span> occur more than once"'
                        ] }
                    ]
                }
            ]
        });

        if (output.values &&
            output.values.length > 1 &&
            output.duplicated &&
            data.name !== 'object' &&  // exclude object and array since we can't presentate those values in legend in short at the moment
            data.name !== 'array') {
            const segments = [];
            const maxSegmentsCount = output.values.length === 10 ? 10 : Math.min(9, output.values.length);
            let duplicateCount = 0;

            for (let i = 0; i < maxSegmentsCount; i++) {
                const { count, value } = output.values[i];

                duplicateCount += count;
                segments.push({
                    name: escapeHtml(String(value)),
                    count,
                    percent: count / output.count,
                    percent100: fixedNum(100 * count / output.count, 1),
                    color: colors[i]
                });
            }

            if (segments.length) {
                const count = output.count - duplicateCount;

                if (count > 0) {
                    segments.push({
                        name: '...',
                        count,
                        percent: count / output.count,
                        percent100: fixedNum(100 * count / output.count, 1),
                        color: colors[segments.length]
                    });
                }

                renderSections.push({
                    view: 'block',
                    className: 'pie-stat',
                    data: segments,
                    content: [
                        {
                            view: 'block',
                            content: {
                                view: 'html',
                                data: svgPieChart
                            }
                        },
                        {
                            view: 'block',
                            content: [
                                'html:"<span class=\\"list-header\\">Dominators:</span>"',
                                {
                                    view: 'list',
                                    item: `html:
                                        "<span class=\\"dot\\" style=\\"--size: 10px; background-color: " + color + "\\"></span> " +
                                        "<span class=\\"caption\\" title=\\"" + name + "\\">" + name + "</span>" +
                                        "<span class=\\"times\\"> × " + count + " (" + percent100 + "%)</span>"
                                    `
                                }
                            ]
                        }
                    ]
                });
            }
        }

        if (data.name === 'number' || data.name === 'string') {
            renderSections.push({
                view: 'content-filter',
                name: 'filter',
                content: {
                    view: 'menu',
                    data: 'values.[no #.filter or value~=#.filter].sort(<value>)',
                    item: [
                        {
                            view: 'block',
                            className: 'caption',
                            content: 'text-match:{ text: value, match: #.filter }'
                        },
                        {
                            view: 'block',
                            when: 'count > 1',
                            className: 'count',
                            content: 'text:" × " + count'
                        }
                    ]
                }
            });
        }

        if (data.name === 'object') {
            renderSections.push({
                view: 'list',
                className: 'struct-list',
                data: 'values',
                item: [
                    'struct:value',
                    {
                        view: 'block',
                        when: 'count > 1',
                        className: 'count',
                        content: 'text:" × " + count'
                    }
                ]
            });
        }

        if (data.name === 'array' && Object.keys(stat.map).length) {
            renderSections.push({
                view: 'block',
                className: 'array-types',
                content: (el) => renderTypeStat(el, stat, discovery)
            });
        }
    }

    discovery.view.render(el, [
        {
            view: 'inline-list',
            when: 'path',
            className: 'path',
            data: 'path'
        },
        {
            view: 'h1',
            className: 'type',
            content: [
                'text:name',
                `html:"<span class=\\"usage-stat\\">" + (
                    count = total
                        ? "only this type is used"
                        : "used in <span class=\\"num\\">" + count + "</span> of <span class=\\"num\\">" + total + "</span> cases (<span class=\\"num\\">" + percent + "</span>)"
                ) + "</span>"`
            ]
        },
        ...renderSections
    ], {
        name: data.name,
        path: data.path,
        total,
        percent: fixedNum(100 * output.count / total, 1) + '%',
        ...output
    }, {});
}

export default function(discovery) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        let activeEl = target.closest(`
            .view-signature .expand,
            .view-signature .collapse
        `);

        if (!activeEl) {
            return;
        }

        if (activeEl.classList.contains('collapse')) {
            activeEl = activeEl.parentNode;
        }

        const data = elementToData.get(activeEl);

        if (data) {
            const { path, map, offset } = data;
            const fragment = createFragment();

            if (map.properties === null) {
                map.properties = Object.create(null);
                map.forEach((_, value) => collectObjectMap(value, 1, map));
            } else {
                map.properties = null;
            }

            renderStat(fragment, { object: map }, elementToData, path, offset);
            activeEl.replaceWith(fragment);
        }
    };

    // single event handler for all `signature` view instances
    document.addEventListener('click', clickHandler, false);

    // signature details popup
    new discovery.view.Popup({
        className: 'signature-details',
        hoverPin: 'trigger-click',
        hoverTriggers: `
            .view-signature .property,
            .view-signature .type
        `,
        render: function(popupEl, triggerEl) {
            const data = elementToData.get(triggerEl);

            switch (data.type) {
                case 'property':
                    return renderPropertyDetails(popupEl, data, discovery);

                case 'type':
                    return renderTypeDetails(popupEl, data, discovery);
            }
        }
    });

    discovery.view.define('signature', function(el, config, data) {
        const { expanded } = config;
        const stat = collectStat(data, expanded);

        renderStat(el, stat, elementToData);
    });
}
