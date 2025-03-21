import type { Model } from './model.js';

type SuggestionType = 'property' | 'value' | 'variable' | 'assertion' | 'method';
type QueryStatApi = {
    stat(pos: number, includeEmpty?: boolean): QueryStatApiSourcePosRange[];
    suggestion(pos: number, options?: Partial<QueryStatApiSuggestionOptions>): QueryStatApiSuggestion[] | null;
}
type QueryStatApiSourcePosRange = {
    context: any;
    from: any;
    to: any;
    text: any;
    values: any;
    related: any;
};
type QueryStatApiSuggestionOptions = {
    limit: number;
    sort: ((a: unknown, b: unknown) => 0 | 1 | -1) | true;
    filter: (pattern: string) => (value: unknown) => boolean;
};
type QueryStatApiSuggestion = {
    type: SuggestionType;
    from: number;
    to: number;
    text: string;
    suggestions: string[];
};

export type Suggestion = {
    type: SuggestionType;
    from: number;
    to: number;
    text: string;
    value: string;
};
type SuggestionStat = {
    query: string;
    data: unknown;
    context: unknown;
    offset: number;
    suggestions: Suggestion[] | null;
    api: QueryStatApi | null
};

const lastQuerySuggestionsStat = new WeakMap<Model, SuggestionStat>();
const typeOrder: SuggestionType[] = ['variable', 'property', 'value', 'assertion', 'method'];
const sortByType = (a: QueryStatApiSuggestion, b: QueryStatApiSuggestion) =>
    typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
const suggestionValueFilter = (pattern: string) => {
    const patternLowerCased = pattern.toLowerCase();

    return (value: unknown) =>
        value !== pattern &&
        // 2022-04-08
        // v8: includes() is 20-30% slower than indexOf() !== -1
        // Firefox & Safari approximate the same
        (typeof value === 'string' ? value : String(value)).toLowerCase().indexOf(patternLowerCased) !== -1;
};

function stringifyValue(value: string, text: string) {
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

function isSameSuggestions(api: QueryStatApi, pos1: number, pos2: number) {
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

export function querySuggestions(
    host: Model,
    query: string,
    offset: number,
    data: unknown,
    context: unknown
): Suggestion[] | null {
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

            stat.api = host.queryFnFromString(query, options)(data, context) as QueryStatApi;
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
        host.logger.error('Error while attempting to retrieve suggestions for the query:', e.message);
        return null;
    }
}
