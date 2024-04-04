export function validateEncodingConfig(config) {
    if (!config || typeof config !== 'object') {
        return 'value is not an object';
    }

    const { name, test, decode } = config;

    if (typeof name !== 'string') {
        return 'missed name';
    }

    if (typeof test !== 'function') {
        return 'missed test function';
    }

    if (typeof decode !== 'function') {
        return 'missed decode function';
    }

    return false;
}

export function normalizeEncodingConfig(config) {
    const error = validateEncodingConfig(config);

    if (error) {
        throw new Error(`Bad encoding config${config?.name ? ` "${config.name}"` : ''}: ${error}`);
    }

    const { name, test, streaming, decode } = config;

    return Object.freeze({
        name: name || 'unknown',
        test,
        streaming: Boolean(streaming),
        decode
    });
}

export function normalizeEncodings(encodings) {
    if (!encodings) {
        return [];
    }

    if (!Array.isArray(encodings)) {
        throw new Error('Encodings must be an array');
    }

    return encodings.map(normalizeEncodingConfig);
}
