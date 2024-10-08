import * as base64 from '../../core/utils/base64.js';

function ensureString(value, fallback) {
    return typeof value === 'string' ? value : fallback || '';
}

export const decodedSpecialParams = ['query', 'graph', 'view', 'title', 'dzen', 'noedit'];
export const encodedSpecialParams = ['q', 'graph', 'v', 'title', 'dzen', 'noedit'];

export function encodeParams(params) {
    const { query, graph, view, title, dzen, noedit, ...extra } = typeof params === 'string' ? { query: params } : params;
    const pairs = [];

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

    Object.keys(extra || {}).sort().forEach(name => {
        if (!decodedSpecialParams.includes(name)) {
            pairs.push([name, name.endsWith('-b64') && typeof extra[name] === 'string'
                ? base64.encode(extra[name])
                : extra[name]
            ]);
        }
    });

    return pairs;
}

export function decodeParams(pairs) {
    const params = Object.fromEntries(pairs);
    const decodedParams = {
        title: params.title || '',
        query: base64.decode(ensureString(params.q, '')),
        graph: JSON.parse(base64.decode(ensureString(params.graph, '')) || 'null'),
        view: 'v' in params ? base64.decode(ensureString(params.v, '')) : undefined,
        dzen: 'dzen' in params,
        noedit: 'noedit' in params
    };

    Object.keys(params).forEach(name => {
        if (!encodedSpecialParams.includes(name)) {
            decodedParams[name] = name.endsWith('-b64') && typeof params[name] === 'string'
                ? base64.decode(params[name])
                : params[name];
        }
    });

    return decodedParams;
}

function filterDecodedParams(params) {
    return Object.fromEntries(Object.entries(params).filter(([key]) =>
        !decodedSpecialParams.includes(key)
    ));
}

function isEqual(a, b, ...skipKeys) {
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

export function contextWithoutEditorParams(newContext, currentContext = {}) {
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
