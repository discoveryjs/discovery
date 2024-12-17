import type { KnownParams, Params } from './types.js';
import * as base64 from '../../core/utils/base64.js';

function ensureString(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

export const decodedSpecialParams: (keyof KnownParams)[] = ['query', 'graph', 'view', 'title', 'dzen', 'noedit'] as const;
export const encodedSpecialParams = ['q', 'graph', 'v', 'title', 'dzen', 'noedit'];

export function encodeParams(params: Partial<Params> | string) {
    const normalizedParams = typeof params === 'string' ? { query: params } : params;
    const { query, graph, view, title, dzen, noedit, ...extra } = normalizedParams;
    const pairs: [name: string, value?: string][] = [];

    if (dzen) {
        pairs.push(['dzen']);
    }

    if (noedit) {
        pairs.push(['noedit']);
    }

    if (title) {
        pairs.push(['title', title]);
    }

    if (query) {
        pairs.push(['q', base64.encode(query)]);
    }

    if (graph) {
        pairs.push(['graph', base64.encode(JSON.stringify(graph))]);
    }

    if (typeof view === 'string') {
        pairs.push(view ? ['v', base64.encode(view)] : ['v']);
    }

    for (const [name, value] of Object.keys(extra || {}).sort()) {
        if (!decodedSpecialParams.includes(name as keyof KnownParams)) {
            pairs.push([name, name.endsWith('-b64') && typeof value === 'string'
                ? base64.encode(value)
                : value
            ]);
        }
    }

    return pairs;
}

export function decodeParams(pairs: [name: string, value: unknown][]): Params {
    const params = Object.fromEntries(pairs);
    const decodedParams: KnownParams = {
        title: ensureString(params.title),
        query: base64.decode(ensureString(params.q)),
        graph: JSON.parse(base64.decode(ensureString(params.graph)) || 'null'),
        view: 'v' in params ? base64.decode(ensureString(params.v)) : undefined,
        dzen: 'dzen' in params,
        noedit: 'noedit' in params
    };

    for (const [name, value] of Object.entries(params)) {
        if (!encodedSpecialParams.includes(name)) {
            decodedParams[name] = name.endsWith('-b64') && typeof value === 'string'
                ? base64.decode(value)
                : params[name];
        }
    }

    return decodedParams satisfies Params;
}

function filterDecodedParams(params: Params) {
    return Object.fromEntries(Object.entries(params).filter(([key]) =>
        !decodedSpecialParams.includes(key as keyof KnownParams)
    ));
}

function isEqual(a: object, b: object, ...skipKeys: string[]) {
    for (const key of Object.keys(a)) {
        if (a[key] !== b[key] && !skipKeys.includes(key)) {
            return false;
        }
    }

    for (const key of Object.keys(b)) {
        if (a[key] !== b[key] && !skipKeys.includes(key)) {
            return false;
        }
    }

    return true;
}

export function contextWithoutEditorParams(newContext: any, currentContext: any = {}) {
    const stableNewContext = {
        ...newContext,
        params: filterDecodedParams(newContext.params)
    };

    if (!isEqual(currentContext, stableNewContext, 'params', 'actions') ||
        !isEqual(currentContext.params, stableNewContext.params) ||
        !isEqual(currentContext.actions, stableNewContext.actions)) {
        return stableNewContext;
    }

    return currentContext;
}
