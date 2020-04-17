import * as base64 from '../../core/utils/base64.js';

function encodeSearchParamPair(name, value) {
    return encodeURIComponent(name) + '=' + encodeURIComponent(value);
}

function ensureString(value, fallback) {
    return typeof value === 'string' ? value : fallback || '';
}

export function encodeParams(params) {
    const specialParams = ['query', 'view', 'title', 'dzen', 'noedit'];
    const { query, view, title, dzen, noedit, extra } = typeof params === 'string' ? { query: params } : params;
    const parts = [];

    if (dzen) {
        parts.push('dzen');
    }

    if (noedit) {
        parts.push('noedit');
    }

    if (title) {
        parts.push(encodeSearchParamPair('title', title));
    }

    if (query) {
        parts.push(encodeSearchParamPair('q', base64.encode(query)));
    }

    if (typeof view === 'string') {
        parts.push(view ? encodeSearchParamPair('v', base64.encode(view)) : 'v');
    }

    Object.keys(extra || {}).sort().forEach(name => {
        if (!specialParams.includes(name)) {
            parts.push(encodeSearchParamPair(name, extra[name]));
        }
    });

    return parts.join('&');
}

export function decodeParams(params) {
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
            decodedParams[name] = params[name];
        }
    });

    return decodedParams;
}
