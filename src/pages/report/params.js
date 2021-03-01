import * as base64 from '../../core/utils/base64.js';

function ensureString(value, fallback) {
    return typeof value === 'string' ? value : fallback || '';
}

export function encodeParams(params) {
    const specialParams = ['query', 'view', 'title', 'dzen', 'noedit'];
    const { query, view, title, dzen, noedit, ...extra } = typeof params === 'string' ? { query: params } : params;
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

    if (typeof view === 'string') {
        pairs.push(view ? ['v', base64.encode(view)] : ['v']);
    }

    Object.keys(extra || {}).sort().forEach(name => {
        if (!specialParams.includes(name)) {
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
    const specialParams = ['q', 'v', 'title', 'dzen', 'noedit'];
    const decodedParams = {
        title: params.title || '',
        query: base64.decode(ensureString(params.q, '')),
        view: 'v' in params ? base64.decode(ensureString(params.v, '')) : undefined,
        dzen: 'dzen' in params,
        noedit: 'noedit' in params
    };

    Object.keys(params).forEach(name => {
        if (!specialParams.includes(name)) {
            decodedParams[name] = name.endsWith('-b64') && typeof params[name] === 'string'
                ? base64.decode(params[name])
                : params[name];
        }
    });

    return decodedParams;
}
