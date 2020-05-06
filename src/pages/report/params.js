import * as base64 from '../../core/utils/base64.js';

const knownEncodeParams = new Set(['query', 'view', 'pipeline', 'title', 'dzen', 'noedit']);
const knownDecodeParams = new Set(['q', 'v', 'p', 'title', 'dzen', 'noedit']);

function encodeSearchParamPair(name, value) {
    return encodeURIComponent(name) + '=' + encodeURIComponent(value);
}

function ensureString(value, fallback) {
    return typeof value === 'string' ? value : fallback || '';
}

export function encodeParams(params) {
    const {
        query,  // backward compatibility
        view,   // backward compatibility
        pipeline: rawPipeline,
        title,
        dzen,
        noedit,
        extra
    } = typeof params === 'string' ? { query: params } : params;
    const pipeline = [];
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

    // backward compatibility
    if (query) {
        pipeline.push(['query', query]);
    }

    // backward compatibility
    if (typeof view === 'string' || query) {
        pipeline.push(view ? ['view', view] : ['view']);
    }

    if (Array.isArray(rawPipeline)) {
        pipeline.push(...rawPipeline);
    }

    if (pipeline.length > 0 || Array.isArray(rawPipeline)) {
        const pipelineJson = JSON.stringify(pipeline);

        if (pipelineJson !== '[["query",""],["view",null]]') {
            parts.push(encodeSearchParamPair('p', base64.encode(pipelineJson)));
        }
    }

    if (extra) {
        Object.keys(extra).sort().forEach(name => {
            if (!knownEncodeParams.has(name)) {
                parts.push(encodeSearchParamPair(name, extra[name]));
            }
        });
    }

    return parts.join('&');
}

export function decodeParams(params) {
    const query = base64.decode(ensureString(params.q, '')); // backward compatibility
    const view = 'v' in params ? base64.decode(ensureString(params.v, '')) : undefined; // backward compatibility
    const rawPipeline = JSON.parse(base64.decode(ensureString(params.p, '')) || '[]');
    const pipeline = Array.isArray(rawPipeline) ? rawPipeline : [];
    const decodedParams = {
        title: params.title || '',
        pipeline,
        dzen: 'dzen' in params,
        noedit: 'noedit' in params
    };

    // backward compatibility
    if (view) {
        pipeline.unshift(['view', view]);
    }

    // backward compatibility
    if (query) {
        pipeline.unshift(['query', query]);
    }

    if (pipeline.length === 0 && !params.p) {
        pipeline.push(['query', ''], ['view', null]);
    }

    Object.keys(params).forEach(name => {
        if (!knownDecodeParams.has(name)) {
            decodedParams[name] = params[name];
        }
    });

    return decodedParams;
}
