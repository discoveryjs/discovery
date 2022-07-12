const lastQuerySuggestionsStat = new WeakMap();
const typeOrder = ['variable', 'property', 'value', 'method'];
const sortByType = (a, b) =>
    typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
const suggestionValueFilter = pattern => value =>
    value !== pattern &&
    // 2022-04-08
    // v8: includes() is 20-30% slower than indexOf() !== -1
    // Firefox & Safari approximate the same
    (typeof value === 'string' ? value : String(value)).toLowerCase().indexOf(pattern) !== -1;

function stringifyValue(value, text) {
    if (typeof value !== 'string') {
        return String(value);
    }

    value = JSON.stringify(value);

    if (text[0] !== "'") {
        return value;
    }

    // convert "string" -> 'string'
    // \" -> "
    // '  -> \'
    // \. -> \. (any other escaped char left as is)
    return `'${value.slice(1, -1).replace(
        /\\.|'/g,
        m => m === '\\"' ? '"' : m === '\'' ? '\\\'' : m
    )}'`;
}

function isSameSuggestions(api, pos1, pos2) {
    if (pos1 === pos2) {
        return true;
    }

    const ranges1 = api.stat(pos1) || [];
    const ranges2 = api.stat(pos2) || [];

    if (ranges1.length !== ranges2.length) {
        return false;
    }

    for (let i = 0; i < ranges1.length; i++) {
        const range1 = ranges1[i];
        const range2 = ranges2[i];

        for (const key of Object.keys(range1)) {
            if (range1[key] !== range2[key]) {
                return false;
            }
        }
    }

    return true;
}

export function querySuggestions(host, query, offset, data, context) {
    try {
        let stat = lastQuerySuggestionsStat.get(host);

        if (!stat || stat.query !== query || stat.data !== data || stat.context !== context) {
            const options = {
                tolerant: true,
                stat: true
            };

            lastQuerySuggestionsStat.set(host, stat = {
                query,
                data,
                context,
                offset: -1,
                suggestions: null,
                api: null
            });

            stat.api = host.queryFnFromString(query, options)(data, context);
        }

        // there is no api in case of query compilation error
        if (stat.api === null) {
            return null;
        }

        // const t0 = Date.now();

        if (stat.offset !== -1 && isSameSuggestions(stat.api, stat.offset, offset)) {
            // console.log('same suggestions', Date.now() - t0, stat.suggestions);
            return stat.suggestions;
        }

        const suggestionsByType = stat.api.suggestion(stat.offset = offset, {
            sort: true,
            filter: suggestionValueFilter,
            limit: 50
        });

        if (suggestionsByType) {
            stat.suggestions = [];

            for (const entry of suggestionsByType.sort(sortByType)) {
                stat.suggestions.push(...entry.suggestions.map(value => ({
                    type: entry.type,
                    from: entry.from,
                    to: entry.to,
                    text: entry.text,
                    value: entry.type === 'value'
                        ? stringifyValue(value, entry.text)
                        : value
                })));
            }
        } else {
            stat.suggestions = null;
        }

        // console.log('new suggestions', Date.now() - t0, stat.suggestions);

        return stat.suggestions;
    } catch (e) {
        console.groupCollapsed('[Discovery] Error on getting suggestions for query');
        console.error(e);
        console.groupEnd();
        return;
    }
}
