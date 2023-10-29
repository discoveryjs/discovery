import { escapeHtml } from '../../core/utils/html.js';
import { typeOrder, colors } from './const.js';

function fixedNum(num, prec) {
    return num.toFixed(prec).replace(/\.?0+$/, '');
}

function getCoordinatesForPercent(percent) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
}

// based on https://medium.com/hackernoon/a-simple-pie-chart-in-svg-dbdd653b6936
function svgPieChart(slices) {
    let cumulativePercent = 0;

    return [
        '<svg viewBox="-1 -1 2 2" class="pie">',
        ...slices.map(slice => {
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent += slice.percent);

            // if the slice is more than 50%, take the large arc (the long way around)
            const largeArcFlag = slice.percent > .5 ? 1 : 0;
            const pathData = [
                `M ${startX} ${startY}`, // Move
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                'L 0 0' // Line
            ];

            return `<path d="${pathData.join(' ')}" fill="${slice.color}"/>`;
        }),
        '</svg>'
    ].join('\n');
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

export function renderPropertyDetails(el, data, host) {
    const { count, map } = data.stat.object.dictMode || data.stat.object.properties.get(data.name);
    const total = (data.stat.object.dictMode || data.stat.object).count;
    const output = {
        name: data.name,
        path: data.path,
        total,
        count,
        percent: fixedNum(100 * count / total, 1) + '%'
    };

    host.view.render(el, [
        {
            view: 'block',
            when: 'path',
            className: 'path',
            data: data => host.pathToQuery(data.path),
            content: 'text:$'
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
    ], output);

    renderTypeStat(el, {
        map,
        count
    }, host);
}

function renderTypeStat(el, { map, count }, host) {
    const typeCounts = getStatCounts(map);
    const typeStat = [];
    const types = typeOrder.filter(type => type in map);

    Object.entries(typeCounts).sort(([,a], [,b]) => a - b).reverse().forEach(([name, val], idx) => {
        typeStat.push({
            name: escapeHtml(name),
            count: val,
            percent: val / count,
            percent100: fixedNum(100 * val / count, 1),
            color: colors[idx]
        });
    });

    host.view.render(el, {
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
    }, typeStat);

    types.forEach(name =>
        renderTypeDetails(el, { name, stat: map }, host)
    );
}

export function renderTypeDetails(el, data, host) {
    const stat = data.stat[data.name];
    const total = getStatCount(data.stat);
    const renderSections = [];
    let output;

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
                type: data.name,
                count,
                distinct: stat.size,
                duplicated,
                min,
                max,
                sum,
                avg: fixedNum(sum / count, 3),
                values: values.sort((a, b) => b.count - a.count || a.value - b.value)
            };

            if (output.distinct > 1) {
                renderSections.push({
                    view: 'block',
                    className: 'overview-stat',
                    content: `html:
                        "range: (min) <span class=\\"num\\">" + min + "</span> ... " +
                        "<span class=\\"num\\">" + max + "</span> (max), " +
                        "avg: <span class=\\"num\\">" + avg + "</span>"
                    `
                });
            }

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
                type: data.name,
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
                'html:"<span class=\\"num\\">" + count + "</span> " + (count > 1 ? "values, " : "value")',
                {
                    view: 'switch',
                    when: 'count > 1',
                    content: [
                        { when: 'distinct = 1', content: 'text:"a single unique value:"' },
                        { when: 'distinct = count', content: 'text:"all unique, no duplicates"' },
                        { content: [
                            'html:"<span class=\\"num\\">" + distinct + "</span> unique, "',
                            'html:duplicated = distinct ? "all occur more than once" : "<span class=\\"num\\">" + duplicated + "</span> occur more than once"'
                        ] }
                    ]
                }
            ]
        });

        if (output.values.length > 1 &&
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

        if (output.values.length > 1) {
            if (data.name === 'number' || data.name === 'string') {
                renderSections.push({
                    view: 'content-filter',
                    name: 'filter',
                    content: {
                        view: 'menu',
                        data: 'values.[no #.filter or value~=#.filter].sort(=>value)',
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
        } else {
            if (data.name === 'number' || data.name === 'string' || data.name === 'boolean') {
                renderSections.push({
                    view: 'struct',
                    data: 'values.pick().value'
                });
            }
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
                content: (el) => renderTypeStat(el, stat, host)
            });
        }
    }

    host.view.render(el, [
        {
            view: 'block',
            when: 'path',
            className: 'path',
            data: data => host.pathToQuery(data.path),
            content: 'text'
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
        ...output,
        name: data.name,
        path: data.path,
        total,
        percent: fixedNum(100 * output.count / total, 1) + '%'
    }, {});
}
