import { isArrayLike } from '../../core/utils/is-type.js';

export function collectObjectMap(value, expanded, objectStat) {
    for (let key in value) {
        if (!hasOwnProperty.call(value, key)) {
            continue;
        }

        if (!expanded) {
            objectStat.properties = null;
            break;
        }

        let propMap;

        if (objectStat.dictMode) {
            propMap = objectStat.dictMode;
            propMap.count++;
            propMap.keys.add(key);
        } else if (objectStat.properties.has(key)) {
            propMap = objectStat.properties.get(key);
            propMap.count++;
        } else {
            propMap = {
                count: 1,
                map: Object.create(null)
            };
            objectStat.properties.set(key, propMap);
        }

        collectStat(value[key], expanded - 1, propMap.map);
    }
}

export function collectStat(value, expanded, stat = Object.create(null)) {
    const type = value === null
        ? 'null'
        : isArrayLike(value)
            ? (value instanceof Set ? 'set' : 'array')
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
                stat.object.properties = new Map();
                stat.object.dictMode = null;
                stat.object.sortKeys = false;
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

        case 'set':
            if ('set' in stat === false) {
                stat.set = new Map();
                stat.set.count++;
                stat.set.map = Object.create(null);
            }

            stat.set.count++;
            stat.set.set(value, (stat.set.get(value) || 0) + 1);

            for (const val of value) {
                collectStat(val, expanded, stat.set.map);
            }

            break;
    }

    return stat;
}
